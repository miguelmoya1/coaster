package repository

import (
	"context"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestAuthEventRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	events := NewAuthEventRepository(testPool)

	err := events.Record(ctx, domain.AuthEvent{
		Type:     domain.AuthEventLoginSucceeded,
		UserID:   user.ID,
		Email:    " ANA@example.com",
		Origin:   domain.SessionOrigin{IP: "1.2.3.4"},
		Metadata: map[string]any{"method": "password"},
	})
	if err != nil {
		t.Fatalf("Record: %v", err)
	}
	if err := events.Record(ctx, domain.AuthEvent{Type: domain.AuthEventLoginFailed, Email: "nadie@example.com"}); err != nil {
		t.Fatalf("Record without user: %v", err)
	}

	recent, err := events.FindRecentOf(ctx, user.ID, 10)
	if err != nil || len(recent) != 1 {
		t.Fatalf("FindRecentOf = %+v, %v", recent, err)
	}
	got := recent[0]
	if got.Email == nil || *got.Email != "ana@example.com" || got.UserAgent != nil || got.Metadata["method"] != "password" {
		t.Fatalf("recorded event = %+v", got)
	}
}
