package repository

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

func insertPrinterEstablishment(t *testing.T, id string) {
	t.Helper()
	_, err := testPool.Exec(context.Background(),
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ($1, 'Bar ' || $1, now())`, id)
	if err != nil {
		t.Fatalf("inserting establishment %s: %v", id, err)
	}
}

func TestPrinterConfigRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	configs := NewPrinterConfigRepository(testPool)
	insertPrinterEstablishment(t, "e1")
	insertPrinterEstablishment(t, "e2")

	if config, err := configs.Find(ctx, "e1"); err != nil || config != nil {
		t.Fatalf("Find before any bridge = %+v, %v", config, err)
	}

	created, err := configs.Create(ctx, "e1")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.EstablishmentID != "e1" || len(created.DeviceKey) != 36 || created.IPAddress != nil ||
		created.Port != domain.DefaultPrinterPort || created.LastSeenAt != nil {
		t.Fatalf("created = %+v", created)
	}

	seenAt := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	if err := configs.RegisterAddress(ctx, "e1", "192.168.1.100", nil, seenAt); err != nil {
		t.Fatalf("RegisterAddress: %v", err)
	}
	found, err := configs.Find(ctx, "e1")
	if err != nil || found.DeviceKey != created.DeviceKey || *found.IPAddress != "192.168.1.100" ||
		found.Port != domain.DefaultPrinterPort || !found.LastSeenAt.Equal(seenAt) {
		t.Fatalf("after RegisterAddress without a port = %+v, %v", found, err)
	}

	port := 9090
	if err := configs.RegisterAddress(ctx, "e1", "192.168.1.101", &port, seenAt.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	if err := configs.RegisterAddress(ctx, "e1", "192.168.1.102", nil, seenAt.Add(2*time.Minute)); err != nil {
		t.Fatal(err)
	}
	found, _ = configs.Find(ctx, "e1")
	if *found.IPAddress != "192.168.1.102" || found.Port != 9090 || !found.LastSeenAt.Equal(seenAt.Add(2*time.Minute)) {
		t.Fatalf("a missing port should keep the one stored: %+v", found)
	}

	if err := configs.RegisterAddress(ctx, "e2", "10.0.0.5", &port, seenAt); err != nil {
		t.Fatalf("RegisterAddress without a bridge: %v", err)
	}
	other, _ := configs.Find(ctx, "e2")
	if other == nil || other.Port != 9090 || len(other.DeviceKey) != 36 || other.DeviceKey == created.DeviceKey {
		t.Fatalf("RegisterAddress should create the bridge: %+v", other)
	}

	if err := configs.RotateDeviceKey(ctx, "e1", "new-key"); err != nil {
		t.Fatal(err)
	}
	later := seenAt.Add(time.Hour)
	if err := configs.TouchLastSeen(ctx, "e1", later); err != nil {
		t.Fatal(err)
	}
	found, _ = configs.Find(ctx, "e1")
	if found.DeviceKey != "new-key" || !found.LastSeenAt.Equal(later) {
		t.Fatalf("after rotating and touching = %+v", found)
	}

	if _, err := configs.Create(ctx, "e1"); err == nil {
		t.Error("a second bridge for the same establishment should fail")
	}
}

func TestPrinterPairingRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	pairings := NewPrinterPairingRepository(testPool)
	insertPrinterEstablishment(t, "e1")

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	if err := pairings.Issue(ctx, "7F3KB92X", "e1", now.Add(time.Hour)); err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if err := pairings.Issue(ctx, "BCDFGHJK", "e1", now.Add(-time.Second)); err != nil {
		t.Fatal(err)
	}
	if err := pairings.Issue(ctx, "7F3KB92X", "e1", now.Add(time.Hour)); err == nil {
		t.Error("a code issued twice should fail")
	}
	if err := pairings.Issue(ctx, "CDFGHJKL", "missing", now.Add(time.Hour)); !domain.HasCode(err, domain.CodeEstablishmentNotFound) {
		t.Errorf("a code for an establishment that does not exist = %v, want ESTABLISHMENT_NOT_FOUND", err)
	}

	tests := []struct {
		name string
		code string
		want string
	}{
		{name: "valid code", code: "7F3KB92X", want: "e1"},
		{name: "the same code again", code: "7F3KB92X", want: ""},
		{name: "expired code", code: "BCDFGHJK", want: ""},
		{name: "code nobody issued", code: "ZZZZZZZZ", want: ""},
	}

	for _, tt := range tests {
		got, err := pairings.Redeem(ctx, tt.code, now)
		if err != nil || got != tt.want {
			t.Errorf("%s: Redeem = %q, %v, want %q", tt.name, got, err, tt.want)
		}
	}
}

func TestPrintJobRepositoryQueue(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	jobs := NewPrintJobRepository(testPool)
	insertPrinterEstablishment(t, "e1")
	insertPrinterEstablishment(t, "e2")

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	if job, err := jobs.ClaimNext(ctx, "e1", now); err != nil || job != nil {
		t.Fatalf("ClaimNext on an empty queue = %+v, %v", job, err)
	}

	table, total := "Mesa 4", "9.00"
	items := []domain.PrintTicketItem{{Name: "Caña <grande>", Quantity: 2, Price: "2.50", Total: "5.00"}}
	first, err := jobs.Enqueue(ctx, "e1", domain.PrintTicket{Type: "order", Table: &table, Items: &items, Total: &total})
	if err != nil {
		t.Fatalf("Enqueue: %v", err)
	}
	second, err := jobs.Enqueue(ctx, "e1", domain.PrintTicket{Type: "raw", Items: &[]domain.PrintTicketItem{}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := jobs.Enqueue(ctx, "e2", domain.PrintTicket{Type: "raw"}); err != nil {
		t.Fatal(err)
	}
	setPrintJobCreatedAt(t, first, now.Add(-2*time.Minute))
	setPrintJobCreatedAt(t, second, now.Add(-time.Minute))

	found, err := jobs.FindByID(ctx, first)
	if err != nil || found.EstablishmentID != "e1" || found.Status != domain.PrintJobPending || found.Error != nil ||
		!found.CreatedAt.Equal(now.Add(-2*time.Minute)) || found.CompletedAt != nil {
		t.Fatalf("FindByID = %+v, %v", found, err)
	}
	if missing, err := jobs.FindByID(ctx, "nope"); err != nil || missing != nil {
		t.Fatalf("FindByID of a job that does not exist = %+v, %v", missing, err)
	}

	claimed, err := jobs.ClaimNext(ctx, "e1", now)
	if err != nil || claimed == nil || claimed.ID != first {
		t.Fatalf("ClaimNext = %+v, %v, want the oldest job", claimed, err)
	}
	wantPayload := `{"type": "order", "items": [{"name": "Caña <grande>", "price": "2.50", "total": "5.00", "quantity": 2}], "table": "Mesa 4", "total": "9.00"}`
	if string(claimed.Payload) != wantPayload {
		t.Errorf("payload = %s, want it as Postgres stores it: %s", claimed.Payload, wantPayload)
	}
	assertPrintJob(t, first, domain.PrintJobPrinting, 1, &now)

	claimed, _ = jobs.ClaimNext(ctx, "e1", now)
	if claimed == nil || claimed.ID != second {
		t.Fatalf("second ClaimNext = %+v", claimed)
	}
	if string(claimed.Payload) != `{"type": "raw", "items": []}` {
		t.Errorf("an empty list should be kept: %s", claimed.Payload)
	}
	if claimed, _ := jobs.ClaimNext(ctx, "e1", now); claimed != nil {
		t.Fatalf("nothing should be left for e1: %+v", claimed)
	}

	completedAt := now.Add(time.Second)
	if err := jobs.Complete(ctx, first, completedAt); err != nil {
		t.Fatal(err)
	}
	if err := jobs.Fail(ctx, second, "out of paper"+strings.Repeat("!", domain.MaxPrintErrorLength), completedAt); err != nil {
		t.Fatal(err)
	}
	printed, _ := jobs.FindByID(ctx, first)
	failed, _ := jobs.FindByID(ctx, second)
	if printed.Status != domain.PrintJobPrinted || printed.Error != nil || !printed.CompletedAt.Equal(completedAt) {
		t.Errorf("printed = %+v", printed)
	}
	wantError := ("out of paper" + strings.Repeat("!", domain.MaxPrintErrorLength))[:domain.MaxPrintErrorLength]
	if failed.Status != domain.PrintJobFailed || *failed.Error != wantError || !failed.CompletedAt.Equal(completedAt) {
		t.Errorf("failed = %+v", failed)
	}

	if err := jobs.Fail(ctx, first, "too late", completedAt); err != nil {
		t.Fatal(err)
	}
	if again, _ := jobs.FindByID(ctx, first); again.Status != domain.PrintJobPrinted || again.Error != nil {
		t.Errorf("a job that is no longer printing should not change: %+v", again)
	}
}

func TestPrintJobRepositoryRequeueStale(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	jobs := NewPrintJobRepository(testPool)
	insertPrinterEstablishment(t, "e1")
	insertPrinterEstablishment(t, "e2")

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	cutoff := now.Add(-domain.PrintJobStaleAfter)

	stale := enqueueClaimed(t, jobs, "e1", cutoff.Add(-time.Second), 1)
	exhausted := enqueueClaimed(t, jobs, "e1", cutoff.Add(-time.Second), domain.MaxPrintAttempts)
	recent := enqueueClaimed(t, jobs, "e1", cutoff.Add(time.Second), 1)
	otherEstablishment := enqueueClaimed(t, jobs, "e2", cutoff.Add(-time.Second), 1)

	if err := jobs.RequeueStale(ctx, "e1", cutoff, now); err != nil {
		t.Fatalf("RequeueStale: %v", err)
	}

	recentClaim, staleClaim := cutoff.Add(time.Second), cutoff.Add(-time.Second)
	assertPrintJob(t, stale, domain.PrintJobPending, 1, nil)
	assertPrintJob(t, recent, domain.PrintJobPrinting, 1, &recentClaim)
	assertPrintJob(t, otherEstablishment, domain.PrintJobPrinting, 1, &staleClaim)

	given, _ := jobs.FindByID(ctx, exhausted)
	if given.Status != domain.PrintJobFailed || given.Error == nil || *given.Error != domain.PrintJobAbandonedError ||
		!given.CompletedAt.Equal(now) {
		t.Errorf("a job out of attempts should fail: %+v", given)
	}

	claimed, err := jobs.ClaimNext(ctx, "e1", now)
	if err != nil || claimed == nil || claimed.ID != stale {
		t.Fatalf("the requeued job should be handed out again: %+v, %v", claimed, err)
	}
	assertPrintJob(t, stale, domain.PrintJobPrinting, 2, &now)
}

// enqueueClaimed queues a job as if a bridge had claimed it at claimedAt, attempts times.
func enqueueClaimed(t *testing.T, jobs *PrintJobRepository, establishmentID string, claimedAt time.Time, attempts int) string {
	t.Helper()
	id, err := jobs.Enqueue(context.Background(), establishmentID, domain.PrintTicket{Type: "raw"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = testPool.Exec(context.Background(),
		`UPDATE "PrintJob" SET status = 'PRINTING', "claimedAt" = $2, attempts = $3 WHERE id = $1`, id, claimedAt, attempts)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func setPrintJobCreatedAt(t *testing.T, id string, createdAt time.Time) {
	t.Helper()
	if _, err := testPool.Exec(context.Background(), `UPDATE "PrintJob" SET "createdAt" = $2 WHERE id = $1`, id, createdAt); err != nil {
		t.Fatal(err)
	}
}

// assertPrintJob checks the columns the API does not send: attempts and claimedAt.
func assertPrintJob(t *testing.T, id string, status domain.PrintJobStatus, attempts int, claimedAt *time.Time) {
	t.Helper()

	var gotStatus string
	var gotAttempts int
	var gotClaimedAt *time.Time
	err := testPool.QueryRow(context.Background(),
		`SELECT status::text, attempts, "claimedAt" FROM "PrintJob" WHERE id = $1`, id,
	).Scan(&gotStatus, &gotAttempts, &gotClaimedAt)
	if err != nil {
		t.Fatal(err)
	}

	sameClaim := (claimedAt == nil && gotClaimedAt == nil) ||
		(claimedAt != nil && gotClaimedAt != nil && gotClaimedAt.Equal(*claimedAt))
	if gotStatus != string(status) || gotAttempts != attempts || !sameClaim {
		t.Errorf("job %s = %s, %d attempts, claimed at %v; want %s, %d, %v", id, gotStatus, gotAttempts, gotClaimedAt, status, attempts, claimedAt)
	}
}

func TestPrintJobRepositoryClaimNextAtOnce(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	jobs := NewPrintJobRepository(testPool)
	insertPrinterEstablishment(t, "e1")

	queued := map[string]bool{}
	for range 6 {
		id, err := jobs.Enqueue(ctx, "e1", domain.PrintTicket{Type: "raw"})
		if err != nil {
			t.Fatal(err)
		}
		queued[id] = true
	}

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	claimed := make([]*domain.ClaimedPrintJob, 6)
	errs := make([]error, 6)
	var wg sync.WaitGroup
	for i := range claimed {
		wg.Go(func() {
			claimed[i], errs[i] = jobs.ClaimNext(ctx, "e1", now)
		})
	}
	wg.Wait()

	for i, job := range claimed {
		if errs[i] != nil || job == nil {
			t.Fatalf("ClaimNext %d = %+v, %v; every bridge should get a job while there are some", i, job, errs[i])
		}
		if !queued[job.ID] {
			t.Fatalf("job %s was handed out twice", job.ID)
		}
		delete(queued, job.ID)
	}
}
