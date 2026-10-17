package repository

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

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
	if _, err := jobs.Enqueue(ctx, "missing", domain.PrintTicket{Type: "raw"}); err == nil {
		t.Fatal("Enqueue for a missing establishment must fail")
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
