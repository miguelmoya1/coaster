package repository

import (
	"context"
	"testing"

	"coaster-api/internal/core/domain"
)

func TestAuthIdentityRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	users := NewAuthUserRepository(testPool)
	identities := NewAuthIdentityRepository(testPool)

	created, err := users.Create(ctx, domain.NewUser{
		Email:    "ana@example.com",
		Name:     "Ana",
		Identity: &domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "sub-1", Email: "ana@example.com"},
	})
	if err != nil {
		t.Fatalf("Create user: %v", err)
	}

	if nobody, err := identities.FindUserBySubject(ctx, domain.AuthProviderGoogle, "missing"); err != nil || nobody != nil {
		t.Fatalf("FindUserBySubject(missing) = %+v, %v", nobody, err)
	}
	byGoogle, err := identities.FindUserBySubject(ctx, domain.AuthProviderGoogle, "sub-1")
	if err != nil || byGoogle == nil || byGoogle.ID != created.ID {
		t.Fatalf("FindUserBySubject = %+v, %v", byGoogle, err)
	}
	if err := identities.Touch(ctx, domain.AuthProviderGoogle, "sub-1"); err != nil {
		t.Fatalf("Touch: %v", err)
	}
	if err := identities.Link(ctx, created.ID, domain.NewIdentity{Provider: domain.AuthProviderGoogle, Subject: "sub-2", Email: "x@example.com"}); err != nil {
		t.Fatalf("Link: %v", err)
	}
	list, err := identities.ListOf(ctx, created.ID)
	if err != nil || len(list) != 1 || list[0].Subject != "sub-2" {
		t.Fatalf("ListOf = %+v, %v", list, err)
	}
	if err := identities.Delete(ctx, created.ID, domain.AuthProviderGoogle); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	list, _ = identities.ListOf(ctx, created.ID)
	if len(list) != 0 {
		t.Fatalf("ListOf after Delete = %+v", list)
	}
}
