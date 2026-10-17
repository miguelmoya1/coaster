package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestSecurityRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	user := createTestUser(t, "ana@example.com")
	security := NewSecurityRepository(testPool)

	statements := []string{
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar', now()), ('e2', 'Otro', now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt") VALUES ('m1', '` + user.ID + `', 'e1', 'MANAGER', true, now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt", "deletedAt") VALUES ('m2', '` + user.ID + `', 'e2', 'OWNER', true, now(), now())`,
		`INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, "updatedAt") VALUES ('s1', 'e1', ARRAY['ORDERS']::"EstablishmentModule"[], now())`,
		`INSERT INTO "EstablishmentSubscription" (id, "establishmentId", status, "manualPlan", "trialEndsAt", "updatedAt") VALUES ('b1', 'e1', 'TRIALING', 'PRO', '2030-01-02 03:04:05.678', now())`,
	}
	for _, statement := range statements {
		if _, err := testPool.Exec(ctx, statement); err != nil {
			t.Fatalf("%s: %v", statement, err)
		}
	}

	role, err := security.UserRole(ctx, user.ID)
	if err != nil || role != domain.RoleUser {
		t.Fatalf("UserRole = %q, %v", role, err)
	}
	if role, _ := security.UserRole(ctx, "nobody"); role != "" {
		t.Fatalf("UserRole(nobody) = %q", role)
	}

	membership, err := security.Membership(ctx, user.ID, "e1")
	if err != nil || membership == nil || membership.Role != string(domain.EstablishmentRoleManager) || !membership.Active {
		t.Fatalf("Membership = %+v, %v", membership, err)
	}
	if deleted, _ := security.Membership(ctx, user.ID, "e2"); deleted != nil {
		t.Fatalf("a deleted membership must not count")
	}

	modules, found, err := security.EnabledModules(ctx, "e1")
	if err != nil || !found || len(modules) != 1 || modules[0] != domain.ModuleOrders {
		t.Fatalf("EnabledModules = %v, %v, %v", modules, found, err)
	}
	if _, found, _ := security.EnabledModules(ctx, "e2"); found {
		t.Fatalf("EnabledModules(e2) must not be found")
	}

	state, err := security.SubscriptionState(ctx, "e1")
	if err != nil || state == nil || state.Status != domain.SubscriptionTrialing || state.ManualPlan == nil || *state.ManualPlan != domain.PlanPro {
		t.Fatalf("SubscriptionState = %+v, %v", state, err)
	}
	if state.TrialEndsAt == nil || state.TrialEndsAt.Time.Format(time.RFC3339Nano) != "2030-01-02T03:04:05.678Z" {
		t.Fatalf("TrialEndsAt = %v", state.TrialEndsAt)
	}
	if state, _ := security.SubscriptionState(ctx, "e2"); state != nil {
		t.Fatalf("SubscriptionState(e2) = %+v", state)
	}
}
