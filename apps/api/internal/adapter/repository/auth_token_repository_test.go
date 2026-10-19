package repository

import (
	"context"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestAuthTokenRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	tokens := NewAuthTokenRepository(testPool)

	if _, err := tokens.Issue(ctx, "nobody", domain.AuthTokenPasswordReset); err == nil {
		t.Fatal("Issue for a missing user must fail")
	}
	if unknown, err := tokens.FindUsable(ctx, "unknown-token", domain.AuthTokenPasswordReset); err != nil || unknown != nil {
		t.Fatalf("FindUsable(unknown) = %+v, %v", unknown, err)
	}

	first, err := tokens.Issue(ctx, user.ID, domain.AuthTokenPasswordReset)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	second, err := tokens.Issue(ctx, user.ID, domain.AuthTokenPasswordReset)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	if stored, _ := tokens.FindUsable(ctx, first, domain.AuthTokenPasswordReset); stored != nil {
		t.Fatalf("a new token must burn the older one")
	}
	if stored, _ := tokens.FindUsable(ctx, second, domain.AuthTokenInvite); stored != nil {
		t.Fatalf("a token must not work for another purpose")
	}

	stored, err := tokens.FindUsable(ctx, second, domain.AuthTokenPasswordReset)
	if err != nil || stored == nil || stored.User.ID != user.ID {
		t.Fatalf("FindUsable = %+v, %v", stored, err)
	}

	spent, err := tokens.Spend(ctx, stored.ID)
	if err != nil || !spent {
		t.Fatalf("Spend = %v, %v", spent, err)
	}
	spent, err = tokens.Spend(ctx, stored.ID)
	if err != nil || spent {
		t.Fatalf("second Spend = %v, %v; want false", spent, err)
	}
}
