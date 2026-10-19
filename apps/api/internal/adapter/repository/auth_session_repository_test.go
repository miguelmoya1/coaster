package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestAuthSessionRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	other := createTestUser(t, "otro@example.com")
	sessions := NewAuthSessionRepository(testPool)

	newSession := func(userID, hash, family string, expiresAt time.Time) *domain.AuthSession {
		t.Helper()
		session, err := sessions.Create(ctx, domain.NewAuthSession{
			UserID: userID, TokenHash: hash, FamilyID: family, ExpiresAt: expiresAt,
			Origin: domain.SessionOrigin{UserAgent: "Firefox", IP: "1.2.3.4"},
		})
		if err != nil {
			t.Fatalf("Create: %v", err)
		}
		return session
	}

	later := time.Now().Add(time.Hour)
	first := newSession(user.ID, "h1", "f1", later)
	newSession(user.ID, "old", "f0", time.Now().Add(-time.Hour))
	newSession(other.ID, "h9", "f9", later)

	found, err := sessions.FindByTokenHash(ctx, "h1")
	if err != nil || found == nil || found.ID != first.ID || found.IP == nil || *found.IP != "1.2.3.4" {
		t.Fatalf("FindByTokenHash = %+v, %v", found, err)
	}

	rotated, err := sessions.Rotate(ctx, first.ID, domain.NewAuthSession{UserID: user.ID, TokenHash: "h2", FamilyID: "f1", ExpiresAt: later})
	if err != nil {
		t.Fatalf("Rotate: %v", err)
	}
	found, _ = sessions.FindByTokenHash(ctx, "h1")
	if found.RotatedAt == nil {
		t.Fatalf("the rotated session must have rotatedAt")
	}

	live, err := sessions.ListLiveOf(ctx, user.ID)
	if err != nil || len(live) != 2 || live[0].ID != rotated.ID {
		t.Fatalf("ListLiveOf = %+v, %v", live, err)
	}

	if owned, _ := sessions.FindOwnedBy(ctx, rotated.ID, other.ID); owned != nil {
		t.Fatalf("FindOwnedBy must not find another user's session")
	}

	if err := sessions.DeleteExpiredOf(ctx, user.ID); err != nil {
		t.Fatalf("DeleteExpiredOf: %v", err)
	}
	if expired, _ := sessions.FindByTokenHash(ctx, "old"); expired != nil {
		t.Fatalf("DeleteExpiredOf must delete the expired session")
	}

	third := newSession(user.ID, "h3", "f3", later)
	if err := sessions.RevokeEveryOtherFamilyOf(ctx, user.ID, "f3"); err != nil {
		t.Fatalf("RevokeEveryOtherFamilyOf: %v", err)
	}
	live, _ = sessions.ListLiveOf(ctx, user.ID)
	if len(live) != 1 || live[0].ID != third.ID {
		t.Fatalf("after RevokeEveryOtherFamilyOf = %+v", live)
	}

	if err := sessions.RevokeFamily(ctx, "f3"); err != nil {
		t.Fatalf("RevokeFamily: %v", err)
	}
	if live, _ = sessions.ListLiveOf(ctx, user.ID); len(live) != 0 {
		t.Fatalf("after RevokeFamily = %+v", live)
	}

	a := newSession(user.ID, "a", "fa", later)
	newSession(user.ID, "b", "fb", later)
	if err := sessions.RevokeEveryOtherSessionOf(ctx, user.ID, a.ID); err != nil {
		t.Fatalf("RevokeEveryOtherSessionOf: %v", err)
	}
	if live, _ = sessions.ListLiveOf(ctx, user.ID); len(live) != 1 || live[0].ID != a.ID {
		t.Fatalf("after RevokeEveryOtherSessionOf = %+v", live)
	}

	if err := sessions.RevokeEverySessionOf(ctx, user.ID); err != nil {
		t.Fatalf("RevokeEverySessionOf: %v", err)
	}
	if live, _ = sessions.ListLiveOf(ctx, user.ID); len(live) != 0 {
		t.Fatalf("after RevokeEverySessionOf = %+v", live)
	}
	if live, _ = sessions.ListLiveOf(ctx, other.ID); len(live) != 1 {
		t.Fatalf("the other user's session must stay live")
	}
}
