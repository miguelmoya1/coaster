package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestBetaTesterRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	testers := NewBetaTesterRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, adminTestNow)
	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, adminTestNow)

	note := "Bar Pepe"
	pepe, err := testers.Add(ctx, "ana@bar.com", &note, "admin")
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	time.Sleep(5 * time.Millisecond)
	luna, err := testers.Add(ctx, "luna@cafe.com", nil, "admin")
	if err != nil {
		t.Fatalf("Add: %v", err)
	}

	found, err := testers.FindByEmail(ctx, "ana@bar.com")
	if err != nil || found == nil || found.ID != pepe || *found.Note != note || *found.InvitedByName != "Miguel" {
		t.Fatalf("FindByEmail = %+v, %v", found, err)
	}
	if missing, err := testers.FindByID(ctx, "nope"); err != nil || missing != nil {
		t.Fatalf("FindByID(nope) = %+v, %v", missing, err)
	}

	all, total, err := testers.List(ctx, "", domain.PageRequest{Page: 1, PageSize: 20})
	if err != nil || total != 2 || len(all) != 2 || all[0].ID != luna || all[1].ID != pepe {
		t.Fatalf("List = %+v, %d, %v", all, total, err)
	}

	for _, search := range []string{"PEPE", "Ana@"} {
		byNote, total, err := testers.List(ctx, search, domain.PageRequest{Page: 1, PageSize: 20})
		if err != nil || total != 1 || len(byNote) != 1 || byNote[0].ID != pepe {
			t.Fatalf("List(%q) = %+v, %d, %v", search, byNote, total, err)
		}
	}

	signUps, err := testers.FindSignUps(ctx, []string{"ana@bar.com", "luna@cafe.com"})
	if err != nil || len(signUps) != 1 || signUps[0].UserID != "ana" || signUps[0].Email != "ana@bar.com" {
		t.Fatalf("FindSignUps = %+v, %v", signUps, err)
	}

	if err := testers.Remove(ctx, pepe); err != nil {
		t.Fatal(err)
	}
	if gone, _ := testers.FindByID(ctx, pepe); gone != nil {
		t.Fatal("the tester is still there")
	}

	adminExec(t, `DELETE FROM "User" WHERE id = 'admin'`)
	orphan, err := testers.FindByID(ctx, luna)
	if err != nil || orphan == nil || orphan.InvitedByName != nil {
		t.Fatalf("FindByID after the inviter left = %+v, %v", orphan, err)
	}
	if _, err := testers.Add(ctx, "luna@cafe.com", nil, "ana"); err == nil {
		t.Fatal("adding a duplicate beta tester email must fail")
	}
}
