package repository

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

func seedBilling(t *testing.T) {
	t.Helper()
	resetDB(t)

	users := []string{
		createTestUser(t, "a@example.com").ID, createTestUser(t, "b@example.com").ID,
		createTestUser(t, "c@example.com").ID, createTestUser(t, "d@example.com").ID,
	}

	statements := []string{
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar', now()), ('e2', 'Otro', now()), ('e3', 'Tercero', now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt") VALUES
			('m1', '` + users[0] + `', 'e1', 'OWNER', true, now()),
			('m2', '` + users[1] + `', 'e1', 'STAFF', true, now()),
			('m3', '` + users[2] + `', 'e1', 'STAFF', false, now())`,
		`INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, active, "updatedAt", "deletedAt") VALUES
			('m4', '` + users[3] + `', 'e1', 'STAFF', true, now(), now())`,
	}
	for _, statement := range statements {
		if _, err := testPool.Exec(context.Background(), statement); err != nil {
			t.Fatalf("seeding: %v", err)
		}
	}
}

func billingUTC(value string) *time.Time {
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return &t
}

func TestEstablishmentSubscriptionRepository(t *testing.T) {
	seedBilling(t)
	ctx := context.Background()
	subscriptions := NewEstablishmentSubscriptionRepository(testPool)

	seats, err := subscriptions.CountBillableSeats(ctx, "e1")
	if err != nil || seats != 2 {
		t.Errorf("CountBillableSeats(e1) = %d, %v, want 2", seats, err)
	}
	seats, err = subscriptions.CountBillableSeats(ctx, "e2")
	if err != nil || seats != 1 {
		t.Errorf("CountBillableSeats(e2) = %d, %v, want at least 1", seats, err)
	}

	missing, err := subscriptions.FindByEstablishmentID(ctx, "e1")
	if err != nil || missing != nil {
		t.Fatalf("FindByEstablishmentID before any upsert = %+v, %v", missing, err)
	}

	subscriptionID := "sub_1"
	err = subscriptions.Upsert(ctx, "e1", domain.SubscriptionUpsert{
		Plan:                 domain.PlanPro,
		Status:               domain.SubscriptionActive,
		StripeCustomerID:     "cus_1",
		StripeSubscriptionID: &subscriptionID,
		Billing: &domain.SubscriptionBilling{
			Seats:              4,
			CurrentPeriodStart: billingUTC("2026-01-01T00:00:00Z"),
			CurrentPeriodEnd:   billingUTC("2026-02-01T00:00:00Z"),
		},
	})
	if err != nil {
		t.Fatalf("Upsert (create): %v", err)
	}

	created, err := subscriptions.FindByStripeSubscriptionID(ctx, "sub_1")
	if err != nil || created == nil {
		t.Fatalf("FindByStripeSubscriptionID = %+v, %v", created, err)
	}
	if created.EstablishmentID != "e1" || created.Plan != domain.PlanPro || created.Status != domain.SubscriptionActive ||
		*created.StripeCustomerID != "cus_1" || created.Seats != 4 || !created.CurrentPeriodEnd.Equal(*billingUTC("2026-02-01T00:00:00Z")) ||
		created.TrialEndsAt != nil || created.ID == "" {
		t.Errorf("created = %+v", created)
	}

	byCustomer, err := subscriptions.FindByStripeCustomerID(ctx, "cus_1")
	if err != nil || byCustomer == nil || byCustomer.ID != created.ID {
		t.Errorf("FindByStripeCustomerID = %+v, %v", byCustomer, err)
	}

	if err := subscriptions.UpdateStatus(ctx, "e1", domain.SubscriptionPastDue); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}

	err = subscriptions.Upsert(ctx, "e1", domain.SubscriptionUpsert{
		Plan: domain.PlanFree, Status: domain.SubscriptionInactive, StripeCustomerID: "cus_1", StripeSubscriptionID: &subscriptionID,
	})
	if err != nil {
		t.Fatalf("Upsert (links only): %v", err)
	}

	linked, _ := subscriptions.FindByEstablishmentID(ctx, "e1")
	if linked.ID != created.ID || linked.Status != domain.SubscriptionInactive || linked.Plan != domain.PlanFree ||
		linked.Seats != 4 || linked.CurrentPeriodEnd == nil {
		t.Errorf("an upsert without billing must keep the seats and dates: %+v", linked)
	}

	err = subscriptions.UpdateFromStripe(ctx, "e1", domain.SubscriptionSnapshot{
		Plan:                 domain.PlanFree,
		Status:               domain.SubscriptionActive,
		StripeSubscriptionID: &subscriptionID,
		Billing:              domain.SubscriptionBilling{Seats: 6, CurrentPeriodEnd: billingUTC("2026-03-01T00:00:00Z")},
	})
	if err != nil {
		t.Fatalf("UpdateFromStripe: %v", err)
	}

	refreshed, _ := subscriptions.FindByEstablishmentID(ctx, "e1")
	if refreshed.Status != domain.SubscriptionActive || refreshed.Plan != domain.PlanFree || refreshed.Seats != 6 ||
		!refreshed.CurrentPeriodEnd.Equal(*billingUTC("2026-03-01T00:00:00Z")) || refreshed.CurrentPeriodStart != nil {
		t.Errorf("refreshed = %+v", refreshed)
	}
}

func TestEstablishmentSubscriptionUpsertReleasesStripeIDs(t *testing.T) {
	seedBilling(t)
	ctx := context.Background()
	subscriptions := NewEstablishmentSubscriptionRepository(testPool)

	link := func(establishmentID, customerID string, subscriptionID *string) {
		t.Helper()
		err := subscriptions.Upsert(ctx, establishmentID, domain.SubscriptionUpsert{
			Plan: domain.PlanPro, Status: domain.SubscriptionActive, StripeCustomerID: customerID, StripeSubscriptionID: subscriptionID,
			Billing: &domain.SubscriptionBilling{Seats: 1},
		})
		if err != nil {
			t.Fatalf("Upsert(%s): %v", establishmentID, err)
		}
	}

	subscriptionID := "sub_moving"
	link("e1", "cus_moving", &subscriptionID)
	link("e3", "cus_other", nil)

	link("e2", "cus_moving", &subscriptionID)

	released, _ := subscriptions.FindByEstablishmentID(ctx, "e1")
	if released.StripeCustomerID != nil || released.StripeSubscriptionID != nil {
		t.Errorf("e1 still holds the Stripe ids: %+v", released)
	}

	claimed, _ := subscriptions.FindByStripeSubscriptionID(ctx, "sub_moving")
	if claimed == nil || claimed.EstablishmentID != "e2" || *claimed.StripeCustomerID != "cus_moving" {
		t.Errorf("claimed = %+v", claimed)
	}

	untouched, _ := subscriptions.FindByEstablishmentID(ctx, "e3")
	if untouched.StripeCustomerID == nil || *untouched.StripeCustomerID != "cus_other" {
		t.Errorf("e3 lost its customer: %+v", untouched)
	}

	link("e2", "cus_moving", nil)
	cleared, _ := subscriptions.FindByEstablishmentID(ctx, "e2")
	if cleared.StripeSubscriptionID != nil || cleared.StripeCustomerID == nil {
		t.Errorf("clearing the subscription id = %+v", cleared)
	}
}
