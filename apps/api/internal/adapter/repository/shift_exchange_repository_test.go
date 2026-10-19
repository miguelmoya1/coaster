package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

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

	if err := exchanges.Delete(ctx, found.ID); err != nil {
		t.Fatal(err)
	}
	if gone, _ := exchanges.FindByID(ctx, found.ID); gone != nil {
		t.Fatal("the exchange is still there")
	}
}
