package repository

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// Rows the shift and time entry tests start from, written straight with SQL.

func insertRotaUser(t *testing.T, id, name string) {
	t.Helper()
	_, err := testPool.Exec(context.Background(),
		`INSERT INTO "User" (id, email, name, "updatedAt") VALUES ($1, $1 || '@example.com', $2, now())`, id, name)
	if err != nil {
		t.Fatalf("inserting user %s: %v", id, err)
	}
}

func insertRotaEstablishment(t *testing.T, id string) {
	t.Helper()
	_, err := testPool.Exec(context.Background(),
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ($1, 'Bar ' || $1, now())`, id)
	if err != nil {
		t.Fatalf("inserting establishment %s: %v", id, err)
	}
}

func insertRotaMember(t *testing.T, establishmentID, userID, role string, active, removed bool) {
	t.Helper()
	_, err := testPool.Exec(context.Background(), `
		INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt", "deletedAt")
		VALUES ($1 || '/' || $2, $2, $1, $3::"EstablishmentRole", $4, now(), CASE WHEN $5 THEN now() END)`,
		establishmentID, userID, role, active, removed)
	if err != nil {
		t.Fatalf("inserting member %s: %v", userID, err)
	}
}

func TestShiftRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	shifts := NewShiftRepository(testPool)

	insertRotaUser(t, "ana", "Ana")
	insertRotaEstablishment(t, "e1")
	insertRotaEstablishment(t, "e2")
	if _, err := testPool.Exec(ctx, `UPDATE "User" SET "photoUrl" = 'https://example.com/ana.png' WHERE id = 'ana'`); err != nil {
		t.Fatal(err)
	}

	notes := "Barra"
	morning := time.Date(2026, 9, 27, 8, 0, 0, 0, time.UTC)
	created, err := shifts.Create(ctx, domain.NewShift{
		EstablishmentID: "e1", UserID: "ana", StartTime: morning, EndTime: morning.Add(8 * time.Hour), Notes: &notes,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.UserName != "Ana" || created.UserImage == nil || *created.Notes != notes || !created.StartTime.Equal(morning) {
		t.Fatalf("created = %+v", created)
	}

	evening, err := shifts.Create(ctx, domain.NewShift{
		EstablishmentID: "e1", UserID: "ana", StartTime: morning.Add(-24 * time.Hour), EndTime: morning.Add(-20 * time.Hour),
	})
	if err != nil || evening.Notes != nil {
		t.Fatalf("Create without notes = %+v, %v", evening, err)
	}
	if _, err := shifts.Create(ctx, domain.NewShift{EstablishmentID: "e2", UserID: "ana", StartTime: morning, EndTime: morning}); err != nil {
		t.Fatal(err)
	}

	all, err := shifts.ListByEstablishment(ctx, "e1", nil, nil)
	if err != nil || len(all) != 2 || all[0].ID != evening.ID || all[1].ID != created.ID {
		t.Fatalf("ListByEstablishment = %+v, %v", all, err)
	}

	from, to := morning, morning.Add(time.Hour)
	between, err := shifts.ListByEstablishment(ctx, "e1", &from, &to)
	if err != nil || len(between) != 1 || between[0].ID != created.ID {
		t.Fatalf("ListByEstablishment between = %+v, %v", between, err)
	}

	missing, err := shifts.FindByID(ctx, "missing")
	if err != nil || missing != nil {
		t.Fatalf("FindByID(missing) = %+v, %v", missing, err)
	}

	if err := shifts.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if gone, _ := shifts.FindByID(ctx, created.ID); gone != nil {
		t.Fatal("the shift is still there")
	}
}

func TestShiftExchangeRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	shifts := NewShiftRepository(testPool)
	exchanges := NewShiftExchangeRepository(testPool)

	insertRotaUser(t, "ana", "Ana")
	insertRotaUser(t, "luis", "Luis")
	insertRotaEstablishment(t, "e1")
	insertRotaMember(t, "e1", "ana", "OWNER", true, false)
	insertRotaMember(t, "e1", "luis", "STAFF", false, false)

	start := time.Date(2026, 9, 27, 8, 0, 0, 0, time.UTC)
	past, _ := shifts.Create(ctx, domain.NewShift{EstablishmentID: "e1", UserID: "ana", StartTime: start.Add(-48 * time.Hour), EndTime: start.Add(-40 * time.Hour)})
	shift, _ := shifts.Create(ctx, domain.NewShift{EstablishmentID: "e1", UserID: "ana", StartTime: start, EndTime: start.Add(8 * time.Hour)})

	if pending, err := exchanges.HasPending(ctx, shift.ID); err != nil || pending {
		t.Fatalf("HasPending before = %v, %v", pending, err)
	}

	if err := exchanges.Create(ctx, shift.ID, "ana", nil); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if err := exchanges.Create(ctx, shift.ID, "ana", nil); err == nil {
		t.Fatal("the database must refuse a second pending offer for the same shift")
	}
	if err := exchanges.Create(ctx, past.ID, "ana", nil); err != nil {
		t.Fatal(err)
	}

	if pending, err := exchanges.HasPending(ctx, shift.ID); err != nil || !pending {
		t.Fatalf("HasPending after = %v, %v", pending, err)
	}

	listed, err := exchanges.ListPending(ctx, "e1", start.Add(-time.Hour))
	if err != nil || len(listed) != 1 || listed[0].ShiftID != shift.ID || listed[0].RequesterName != "Ana" ||
		listed[0].TargetID != nil || listed[0].Status != domain.ShiftExchangePending || !listed[0].ShiftStartTime.Equal(start) {
		t.Fatalf("ListPending = %+v, %v", listed, err)
	}

	found, err := exchanges.FindByID(ctx, listed[0].ID)
	if err != nil || found.ShiftEstablishmentID != "e1" || found.RequesterID != "ana" || !found.ShiftStartTime.Equal(start) {
		t.Fatalf("FindByID = %+v, %v", found, err)
	}

	claimed, err := exchanges.AcceptAndSwap(ctx, found.ID, shift.ID, "luis")
	if err != nil || !claimed {
		t.Fatalf("AcceptAndSwap = %v, %v", claimed, err)
	}
	claimed, err = exchanges.AcceptAndSwap(ctx, found.ID, shift.ID, "ana")
	if err != nil || claimed {
		t.Fatalf("second AcceptAndSwap = %v, %v; want false", claimed, err)
	}

	handed, _ := shifts.FindByID(ctx, shift.ID)
	approved, _ := exchanges.FindByID(ctx, found.ID)
	if handed.UserID != "luis" || approved.Status != domain.ShiftExchangeApproved || *approved.TargetID != "luis" {
		t.Fatalf("after the swap: shift %+v, exchange %+v", handed, approved)
	}

	owner, err := exchanges.Membership(ctx, "ana", "e1")
	if err != nil || owner.Role != "OWNER" || !owner.Active {
		t.Fatalf("Membership(ana) = %+v, %v", owner, err)
	}
	if nobody, err := exchanges.Membership(ctx, "nobody", "e1"); err != nil || nobody != nil {
		t.Fatalf("Membership(nobody) = %+v, %v", nobody, err)
	}

	if err := exchanges.Delete(ctx, found.ID); err != nil {
		t.Fatal(err)
	}
	if gone, _ := exchanges.FindByID(ctx, found.ID); gone != nil {
		t.Fatal("the exchange is still there")
	}
}
