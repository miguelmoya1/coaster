package repository

import (
	"context"
	"testing"

	"coaster-api/internal/core/domain"
)

func createTestUser(t *testing.T, email string) *domain.AuthUser {
	t.Helper()

	hash := "hash"
	user, err := NewAuthUserRepository(testPool).Create(context.Background(), domain.NewUser{
		Email:        email,
		Name:         "Ana",
		PasswordHash: &hash,
	})
	if err != nil {
		t.Fatalf("creating user: %v", err)
	}
	return user
}

func TestAuthUserRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	users := NewAuthUserRepository(testPool)

	english := "en"
	created, err := users.Create(ctx, domain.NewUser{
		Email:    "ana@example.com",
		Name:     "Ana",
		Language: &english,
		Identity: &domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "sub-1", Email: "ana@example.com"},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.Role != domain.RoleUser || !created.Active || created.PasswordHash != nil || created.Language == nil || *created.Language != "en" {
		t.Fatalf("created user = %+v", created)
	}

	found, err := users.FindByEmail(ctx, "  ANA@example.com ")
	if err != nil || found == nil || found.ID != created.ID {
		t.Fatalf("FindByEmail = %+v, %v", found, err)
	}

	missing, err := users.FindByID(ctx, "nobody")
	if err != nil || missing != nil {
		t.Fatalf("FindByID(nobody) = %+v, %v", missing, err)
	}

	if _, err := users.Create(ctx, domain.NewUser{Email: "ana@example.com", Name: "Duplicate"}); err == nil {
		t.Fatal("creating a user with a duplicate email must fail")
	}
	if _, err := users.Create(ctx, domain.NewUser{
		Email:    "other@example.com",
		Name:     "Other",
		Identity: &domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "sub-1", Email: "ana@example.com"},
	}); err == nil {
		t.Fatal("creating a user with an already linked identity must fail")
	}

	if err := users.MarkEmailVerified(ctx, created.ID); err != nil {
		t.Fatalf("MarkEmailVerified: %v", err)
	}
	found, _ = users.FindByID(ctx, created.ID)
	if found.EmailVerifiedAt == nil {
		t.Fatalf("after MarkEmailVerified = %+v", found)
	}

	if err := users.SetPassword(ctx, created.ID, "new-hash", true); err != nil {
		t.Fatalf("SetPassword: %v", err)
	}
	found, _ = users.FindByID(ctx, created.ID)
	if found.PasswordHash == nil || *found.PasswordHash != "new-hash" || found.EmailVerifiedAt == nil {
		t.Fatalf("after SetPassword = %+v", found)
	}

	photo := "https://example.com/ana.png"
	if err := users.ClaimForGoogle(ctx, created.ID, true, &photo); err != nil {
		t.Fatalf("ClaimForGoogle: %v", err)
	}
	found, _ = users.FindByID(ctx, created.ID)
	if found.PasswordHash != nil || found.PhotoURL == nil || *found.PhotoURL != photo {
		t.Fatalf("after ClaimForGoogle = %+v", found)
	}

	if _, err := testPool.Exec(ctx, `INSERT INTO "BetaTester" (id, email) VALUES ('b1', 'beta@example.com')`); err != nil {
		t.Fatal(err)
	}
	for email, want := range map[string]bool{"beta@example.com": true, "ana@example.com": false} {
		got, err := users.IsBetaTester(ctx, email)
		if err != nil || got != want {
			t.Errorf("IsBetaTester(%s) = %v, %v; want %v", email, got, err, want)
		}
	}
}
