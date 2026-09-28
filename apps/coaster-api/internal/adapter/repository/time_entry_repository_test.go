package repository

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func timeEntryWorkday(date string) time.Time {
	parsed, _ := domain.ParseWorkdayDate(date)
	return parsed
}

func newTestPunch(userID string, punchType domain.TimeEntryType, occurredAt time.Time, date string) domain.AppendTimeEntry {
	return domain.AppendTimeEntry{
		EstablishmentID: "e1",
		UserID:          userID,
		UserSnapshot:    domain.TimeEntrySnapshot{Name: "Ana", Email: "ana@example.com"},
		Type:            punchType,
		Action:          domain.TimeEntryRecordedAction,
		OccurredAt:      occurredAt,
		WorkdayDate:     timeEntryWorkday(date),
		Source:          domain.TimeEntryFromEmployeeDevice,
		ActorID:         userID,
	}
}

func TestTimeEntryRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	entries := NewTimeEntryRepository(testPool)

	insertRotaUser(t, "ana", "Ana")
	insertRotaUser(t, "luis", "Luis")
	insertRotaEstablishment(t, "e1")
	insertRotaMember(t, "e1", "ana", "MANAGER", true, false)
	insertRotaMember(t, "e1", "luis", "STAFF", false, false)

	clockIn := time.Date(2026, 8, 8, 8, 0, 0, 123456789, time.UTC)
	latitude := 40.4
	punch := newTestPunch("ana", domain.TimeEntryClockIn, clockIn, "2026-08-08")
	punch.Latitude = &latitude

	first, err := entries.Append(ctx, punch)
	if err != nil {
		t.Fatalf("Append: %v", err)
	}
	if first.Sequence != 1 || first.PrevHash != domain.GenesisHash || first.RootID != first.ID || first.UserName != "Ana" ||
		*first.ActorName != "Ana" || *first.Latitude != latitude || !first.OccurredAt.Equal(clockIn.Truncate(time.Millisecond)) {
		t.Fatalf("first = %+v", first)
	}
	if domain.FormatWorkdayDate(first.WorkdayDate) != "2026-08-08" || first.UserSnapshot.Email != "ana@example.com" {
		t.Fatalf("first = %+v", first)
	}

	supersedes := first.ID
	reason := "Entré antes"
	amendment := newTestPunch("ana", domain.TimeEntryClockIn, clockIn.Add(-time.Hour), "2026-08-08")
	amendment.Action = domain.TimeEntryAmendedAction
	amendment.RootID = first.RootID
	amendment.SupersedesID = &supersedes
	amendment.Reason = &reason
	amendment.ActorID = "luis"

	second, err := entries.Append(ctx, amendment)
	if err != nil {
		t.Fatalf("Append amendment: %v", err)
	}
	if second.Sequence != 2 || second.PrevHash != first.Hash || second.RootID != first.ID || *second.ActorName != "Luis" {
		t.Fatalf("second = %+v", second)
	}

	if _, err := entries.Append(ctx, newTestPunch("luis", domain.TimeEntryClockIn, clockIn, "2026-08-07")); err != nil {
		t.Fatal(err)
	}

	chain, err := entries.FindChain(ctx, "e1")
	if err != nil || len(chain) != 3 {
		t.Fatalf("FindChain = %d rows, %v", len(chain), err)
	}
	if result := domain.VerifyChain(chain); !result.Valid {
		t.Fatalf("the chain the repository wrote does not verify: %+v", result)
	}

	current, err := entries.FindCurrentByID(ctx, "e1", first.ID)
	if err != nil || current.SupersededByID == nil || *current.SupersededByID != second.ID {
		t.Fatalf("FindCurrentByID(first) = %+v, %v", current, err)
	}
	current, err = entries.FindCurrentByID(ctx, "e1", second.ID)
	if err != nil || current.SupersededByID != nil {
		t.Fatalf("FindCurrentByID(second) = %+v, %v", current, err)
	}
	if other, err := entries.FindCurrentByID(ctx, "e2", first.ID); err != nil || other != nil {
		t.Fatalf("FindCurrentByID in another establishment = %+v, %v", other, err)
	}

	ofDay, err := entries.FindByWorkdayRange(ctx, "e1", timeEntryWorkday("2026-08-08"), timeEntryWorkday("2026-08-08"), "")
	if err != nil || len(ofDay) != 2 {
		t.Fatalf("FindByWorkdayRange(8th) = %d rows, %v", len(ofDay), err)
	}
	both, err := entries.FindByWorkdayRange(ctx, "e1", timeEntryWorkday("2026-08-07"), timeEntryWorkday("2026-08-08"), "")
	if err != nil || len(both) != 3 {
		t.Fatalf("FindByWorkdayRange(7th-8th) = %d rows, %v", len(both), err)
	}
	luis, err := entries.FindByWorkdayRange(ctx, "e1", timeEntryWorkday("2026-08-07"), timeEntryWorkday("2026-08-08"), "luis")
	if err != nil || len(luis) != 1 || luis[0].UserID != "luis" {
		t.Fatalf("FindByWorkdayRange(luis) = %+v, %v", luis, err)
	}

	latest, err := entries.FindLatestWorkday(ctx, "e1", "ana")
	if err != nil || len(latest) != 2 {
		t.Fatalf("FindLatestWorkday(ana) = %d rows, %v", len(latest), err)
	}
	if none, err := entries.FindLatestWorkday(ctx, "e1", "nobody"); err != nil || len(none) != 0 {
		t.Fatalf("FindLatestWorkday(nobody) = %+v, %v", none, err)
	}

	roots, err := entries.FindByRoots(ctx, []string{first.RootID})
	if err != nil || len(roots) != 2 || roots[0].ID != first.ID {
		t.Fatalf("FindByRoots = %+v, %v", roots, err)
	}

	member, err := entries.FindActiveMember(ctx, "e1", "ana")
	if err != nil || member == nil || member.Name != "Ana" || member.Email != "ana@example.com" || member.Role != domain.EstablishmentRoleManager {
		t.Fatalf("FindActiveMember(ana) = %+v, %v", member, err)
	}
	if inactive, err := entries.FindActiveMember(ctx, "e1", "luis"); err != nil || inactive != nil {
		t.Fatalf("FindActiveMember(inactive) = %+v, %v", inactive, err)
	}
}

func TestTimeEntryRepositoryIsAppendOnly(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	insertRotaUser(t, "ana", "Ana")
	insertRotaEstablishment(t, "e1")

	punch, err := NewTimeEntryRepository(testPool).Append(ctx, newTestPunch("ana", domain.TimeEntryClockIn, time.Now(), "2026-08-08"))
	if err != nil {
		t.Fatal(err)
	}

	for _, statement := range []string{
		`UPDATE "TimeEntry" SET "occurredAt" = now() WHERE id = $1`,
		`DELETE FROM "TimeEntry" WHERE id = $1`,
	} {
		_, err := testPool.Exec(ctx, statement, punch.ID)
		if err == nil || !strings.Contains(err.Error(), "append-only") {
			t.Errorf("%s: err = %v, want the append-only trigger", statement, err)
		}
	}
}

func TestTimeEntryRepositoryAppendsOneAfterAnother(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	entries := NewTimeEntryRepository(testPool)
	insertRotaUser(t, "ana", "Ana")
	insertRotaEstablishment(t, "e1")

	var wg sync.WaitGroup
	errs := make(chan error, 10)
	for range 10 {
		wg.Go(func() {
			_, err := entries.Append(ctx, newTestPunch("ana", domain.TimeEntryClockIn, time.Now(), "2026-08-08"))
			errs <- err
		})
	}
	wg.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("a concurrent Append failed: %v", err)
		}
	}

	chain, _ := entries.FindChain(ctx, "e1")
	if result := domain.VerifyChain(chain); !result.Valid || result.Checked != 10 {
		t.Fatalf("the chain after concurrent appends = %+v", result)
	}
}

func TestTimeEntryRepositoryRecordAudit(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	insertRotaUser(t, "admin", "Admin")

	previous := "2026-08-08T08:00:00.000Z"
	reason := "Olvidó fichar"
	err := NewTimeEntryRepository(testPool).RecordAudit(ctx, domain.TimeEntryAudit{
		ActorID:     "admin",
		Action:      domain.AuditTimeEntryAmended,
		TargetID:    "root-1",
		TargetLabel: "Luis · 2026-08-08",
		Reason:      &reason,
		Metadata: domain.TimeEntryAuditMetadata{
			EstablishmentID:    "e1",
			UserID:             "luis",
			Type:               domain.TimeEntryClockIn,
			OccurredAt:         domain.NewTime(time.Date(2026, 8, 8, 7, 0, 0, 0, time.UTC)),
			PreviousOccurredAt: &previous,
		},
	})
	if err != nil {
		t.Fatalf("RecordAudit: %v", err)
	}

	var action, targetType, targetID, label, storedReason string
	var metadata map[string]any
	err = testPool.QueryRow(ctx, `SELECT action, "targetType", "targetId", "targetLabel", reason, metadata FROM "AdminAuditLog"`).
		Scan(&action, &targetType, &targetID, &label, &storedReason, &metadata)
	if err != nil {
		t.Fatal(err)
	}

	if action != "TIME_ENTRY_AMENDED" || targetType != "TIME_ENTRY" || targetID != "root-1" || label != "Luis · 2026-08-08" || storedReason != reason {
		t.Fatalf("row = %s %s %s %s %s", action, targetType, targetID, label, storedReason)
	}

	got, _ := json.Marshal(metadata)
	want := `{"establishmentId":"e1","occurredAt":"2026-08-08T07:00:00.000Z","previousOccurredAt":"2026-08-08T08:00:00.000Z","type":"CLOCK_IN","userId":"luis"}`
	if string(got) != want {
		t.Fatalf("metadata = %s, want %s", got, want)
	}
}
