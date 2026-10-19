package repository

import (
	"context"
	"encoding/json"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func adminExec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := testPool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func insertAdminUser(t *testing.T, id, name, email, role string, active bool, createdAt time.Time) {
	t.Helper()
	adminExec(t, `INSERT INTO "User" (id, email, name, role, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::"Role", $5, $6, $6)`,
		id, email, name, role, active, createdAt)
}

func insertAdminEstablishment(t *testing.T, id, name string, createdAt time.Time) {
	t.Helper()
	adminExec(t, `INSERT INTO "Establishment" (id, name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $3)`, id, name, createdAt)
}

func insertAdminMember(t *testing.T, id, establishmentID, userID, role string, active, removed bool, createdAt time.Time) {
	t.Helper()
	adminExec(t, `
		INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "createdAt", "updatedAt", "deletedAt")
		VALUES ($1, $2, $3, $4::"EstablishmentRole", $5, $6::timestamp(3), $6, CASE WHEN $7 THEN $6 END)`,
		id, userID, establishmentID, role, active, createdAt, removed)
}

func insertAdminSubscription(t *testing.T, establishmentID, status string, set string, args ...any) {
	t.Helper()
	adminExec(t, `INSERT INTO "EstablishmentSubscription" (id, "establishmentId", status, "updatedAt") VALUES ('sub-' || $1::text, $1, $2::"SubscriptionStatus", now())`,
		establishmentID, status)
	if set != "" {
		adminExec(t, `UPDATE "EstablishmentSubscription" SET `+set+` WHERE "establishmentId" = $1`, append([]any{establishmentID}, args...)...)
	}
}

var adminTestNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

func daysBefore(days int) time.Time {
	return adminTestNow.Add(-time.Duration(days) * 24 * time.Hour)
}

func TestAdminAuditRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	audit := NewAdminAuditRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, adminTestNow)

	label := "Bar Pepe"
	type renamed struct {
		From string `json:"from"`
		To   string `json:"to"`
	}
	entries := []domain.AdminAuditEntry{
		{ActorID: "admin", Action: domain.AuditEstablishmentRenamed, TargetType: domain.AuditTargetEstablishment, TargetID: "e1",
			TargetLabel: &label, Metadata: renamed{From: "Bar", To: "Bar Pepe"}},
		{ActorID: "admin", Action: domain.AuditBetaTesterAdded, TargetType: domain.AuditTargetBetaTester, TargetID: "b1"},
		{ActorID: "admin", Action: domain.AuditEstablishmentPlanGranted, TargetType: domain.AuditTargetEstablishment, TargetID: "e1"},
	}
	for _, entry := range entries {
		if err := audit.Record(ctx, entry); err != nil {
			t.Fatalf("Record: %v", err)
		}
		time.Sleep(5 * time.Millisecond)
	}

	all, total, err := audit.List(ctx, domain.AdminAuditFilter{}, domain.PageRequest{Page: 1, PageSize: 2})
	if err != nil || total != 3 || len(all) != 2 {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}
	if all[0].Action != domain.AuditEstablishmentPlanGranted || all[1].Action != domain.AuditBetaTesterAdded {
		t.Errorf("List is not newest first: %s, %s", all[0].Action, all[1].Action)
	}
	if all[0].ActorName != "Miguel" || all[0].ActorEmail != "miguel@example.com" || all[0].Metadata != nil || all[0].TargetLabel != nil {
		t.Errorf("entry = %+v", all[0])
	}

	lastPage, total, err := audit.List(ctx, domain.AdminAuditFilter{}, domain.PageRequest{Page: 2, PageSize: 2})
	if err != nil || total != 3 || len(lastPage) != 1 || lastPage[0].Action != domain.AuditEstablishmentRenamed {
		t.Fatalf("List page 2 = %+v, %d, %v", lastPage, total, err)
	}
	if string(lastPage[0].Metadata) != `{"to": "Bar Pepe", "from": "Bar"}` || *lastPage[0].TargetLabel != label {
		t.Errorf("metadata = %s", lastPage[0].Metadata)
	}

	filtered, total, err := audit.List(ctx, domain.AdminAuditFilter{TargetType: domain.AuditTargetEstablishment, TargetID: "e1", Action: domain.AuditEstablishmentRenamed},
		domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || total != 1 || len(filtered) != 1 {
		t.Fatalf("List filtered = %+v, %d, %v", filtered, total, err)
	}

	recent, err := audit.RecentFor(ctx, domain.AuditTargetEstablishment, "e1", 1)
	if err != nil || len(recent) != 1 || recent[0].Action != domain.AuditEstablishmentPlanGranted {
		t.Fatalf("RecentFor = %+v, %v", recent, err)
	}

	none, err := audit.RecentFor(ctx, domain.AuditTargetUser, "e1", 10)
	if err != nil || none == nil || len(none) != 0 {
		t.Fatalf("RecentFor nobody = %#v, %v", none, err)
	}
}

func TestAdminAuditRepositoryPagesEntriesOfTheSameInstant(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	audit := NewAdminAuditRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, adminTestNow)
	for _, id := range []string{"a3", "a1", "a5", "a2", "a4"} {
		adminExec(t, `INSERT INTO "AdminAuditLog" (id, "actorId", action, "targetType", "targetId", "createdAt")
			VALUES ($1, 'admin', 'BETA_TESTER_ADDED', 'BETA_TESTER', 'b1', $2)`, id, adminTestNow)
	}

	var ids []string
	for page := 1; page <= 3; page++ {
		entries, total, err := audit.List(ctx, domain.AdminAuditFilter{}, domain.PageRequest{Page: page, PageSize: 2})
		if err != nil || total != 5 {
			t.Fatalf("List page %d = %d, %v", page, total, err)
		}
		for _, entry := range entries {
			ids = append(ids, entry.ID)
		}
	}
	if !slices.Equal(ids, []string{"a5", "a4", "a3", "a2", "a1"}) {
		t.Errorf("pages = %v", ids)
	}

	recent, err := audit.RecentFor(ctx, domain.AuditTargetBetaTester, "b1", 2)
	if err != nil || len(recent) != 2 || recent[0].ID != "a5" || recent[1].ID != "a4" {
		t.Errorf("RecentFor = %+v, %v", recent, err)
	}
}

func TestAdminAuditRepositoryRecordsATimeEntryChange(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	insertRotaUser(t, "admin", "Admin")

	previous := "2026-08-08T08:00:00.000Z"
	reason := "Olvidó fichar"
	label := "Luis · 2026-08-08"
	err := NewAdminAuditRepository(testPool).Record(ctx, domain.AdminAuditEntry{
		ActorID:     "admin",
		Action:      domain.AuditTimeEntryAmended,
		TargetType:  domain.AuditTargetTimeEntry,
		TargetID:    "root-1",
		TargetLabel: &label,
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
		t.Fatalf("Record: %v", err)
	}

	var action, targetType, targetID, storedLabel, storedReason string
	var metadata map[string]any
	err = testPool.QueryRow(ctx, `SELECT action, "targetType", "targetId", "targetLabel", reason, metadata FROM "AdminAuditLog"`).
		Scan(&action, &targetType, &targetID, &storedLabel, &storedReason, &metadata)
	if err != nil {
		t.Fatal(err)
	}

	if action != "TIME_ENTRY_AMENDED" || targetType != "TIME_ENTRY" || targetID != "root-1" || storedLabel != label || storedReason != reason {
		t.Fatalf("row = %s %s %s %s %s", action, targetType, targetID, storedLabel, storedReason)
	}

	got, _ := json.Marshal(metadata)
	want := `{"establishmentId":"e1","occurredAt":"2026-08-08T07:00:00.000Z","previousOccurredAt":"2026-08-08T08:00:00.000Z","type":"CLOCK_IN","userId":"luis"}`
	if string(got) != want {
		t.Fatalf("metadata = %s, want %s", got, want)
	}
}
