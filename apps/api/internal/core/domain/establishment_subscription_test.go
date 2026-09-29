package domain

import (
	"encoding/json"
	"testing"
	"time"
)

var subscriptionNow = time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)

func testTime(value string) *time.Time {
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		panic(err)
	}
	return &t
}

func activeSubscription() *EstablishmentSubscription {
	return &EstablishmentSubscription{
		ID:                   "sub_id_1",
		EstablishmentID:      "establishment_id_1",
		Plan:                 PlanPro,
		Status:               SubscriptionActive,
		StripeCustomerID:     new("cus_123"),
		StripeSubscriptionID: new("sub_123"),
		CurrentPeriodStart:   testTime("2026-01-01T00:00:00Z"),
		CurrentPeriodEnd:     testTime("2026-02-01T00:00:00Z"),
		Seats:                1,
		CreatedAt:            subscriptionNow,
		UpdatedAt:            subscriptionNow,
	}
}

func TestSubscriptionViewJSON(t *testing.T) {
	raw, err := json.Marshal(activeSubscription().View(subscriptionNow))
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"sub_id_1","establishmentId":"establishment_id_1","plan":"PRO","status":"ACTIVE",` +
		`"stripeCustomerId":"cus_123","stripeSubscriptionId":"sub_123",` +
		`"currentPeriodStart":"2026-01-01T00:00:00.000Z","currentPeriodEnd":"2026-02-01T00:00:00.000Z",` +
		`"trialEndsAt":null,"canceledAt":null,` +
		`"createdAt":"2026-01-15T00:00:00.000Z","updatedAt":"2026-01-15T00:00:00.000Z","manualGrant":null}`
	if string(raw) != want {
		t.Errorf("View =\n%s\nwant\n%s", raw, want)
	}
}

func TestSubscriptionEffectiveStatus(t *testing.T) {
	tests := []struct {
		name   string
		change func(*EstablishmentSubscription)
		want   SubscriptionStatus
	}{
		{"ACTIVE without a Stripe subscription is INACTIVE", func(s *EstablishmentSubscription) { s.StripeSubscriptionID = nil }, SubscriptionInactive},
		{"ACTIVE without a billing period is INACTIVE", func(s *EstablishmentSubscription) { s.CurrentPeriodEnd = nil }, SubscriptionInactive},
		{"ACTIVE past its period is EXPIRED", func(s *EstablishmentSubscription) { s.CurrentPeriodEnd = testTime("2026-01-01T00:00:00Z") }, SubscriptionExpired},
		{"TRIALING past the trial is EXPIRED", func(s *EstablishmentSubscription) {
			s.Status = SubscriptionTrialing
			s.TrialEndsAt = testTime("2026-01-01T00:00:00Z")
		}, SubscriptionExpired},
		{"TRIALING while the trial runs", func(s *EstablishmentSubscription) {
			s.Status = SubscriptionTrialing
			s.TrialEndsAt = testTime("2026-02-01T00:00:00Z")
		}, SubscriptionTrialing},
		{"CANCELED while the paid period runs", func(s *EstablishmentSubscription) { s.Status = SubscriptionCanceled }, SubscriptionCanceled},
		{"ACTIVE within its period", func(*EstablishmentSubscription) {}, SubscriptionActive},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			subscription := activeSubscription()
			tt.change(subscription)

			if got := subscription.View(subscriptionNow).Status; got != tt.want {
				t.Errorf("status = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestFreeSubscriptionView(t *testing.T) {
	raw, err := json.Marshal(FreeSubscriptionView("establishment_id_1", subscriptionNow))
	if err != nil {
		t.Fatal(err)
	}

	want := `{"id":"","establishmentId":"establishment_id_1","plan":"FREE","status":"INACTIVE",` +
		`"stripeCustomerId":null,"stripeSubscriptionId":null,"currentPeriodStart":null,"currentPeriodEnd":null,` +
		`"trialEndsAt":null,"canceledAt":null,"manualGrant":null,` +
		`"createdAt":"2026-01-15T00:00:00.000Z","updatedAt":"2026-01-15T00:00:00.000Z"}`
	if string(raw) != want {
		t.Errorf("FreeSubscriptionView =\n%s\nwant\n%s", raw, want)
	}
}

func TestSubscriptionViewManualGrants(t *testing.T) {
	pro, free := PlanPro, PlanFree

	tests := []struct {
		name       string
		change     func(*EstablishmentSubscription)
		wantPlan   SubscriptionPlan
		wantStatus SubscriptionStatus
		wantGrant  string
	}{
		{
			name: "an open-ended grant is PRO and ACTIVE",
			change: func(s *EstablishmentSubscription) {
				s.Plan, s.Status, s.StripeSubscriptionID = PlanFree, SubscriptionInactive, nil
				s.ManualPlan = &pro
			},
			wantPlan: PlanPro, wantStatus: SubscriptionActive, wantGrant: `{"plan":"PRO","expiresAt":null}`,
		},
		{
			name: "a FREE manual plan grants nothing",
			change: func(s *EstablishmentSubscription) {
				s.Plan, s.Status, s.StripeSubscriptionID = PlanFree, SubscriptionInactive, nil
				s.ManualPlan = &free
			},
			wantPlan: PlanFree, wantStatus: SubscriptionInactive, wantGrant: "null",
		},
		{
			name: "an expired grant falls back to the Stripe state",
			change: func(s *EstablishmentSubscription) {
				s.Plan, s.Status, s.StripeSubscriptionID = PlanFree, SubscriptionInactive, nil
				s.ManualPlan = &pro
				s.ManualGrantExpiresAt = testTime("2026-01-01T00:00:00Z")
			},
			wantPlan: PlanFree, wantStatus: SubscriptionInactive, wantGrant: "null",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			subscription := activeSubscription()
			tt.change(subscription)

			view := subscription.View(subscriptionNow)
			grant, _ := json.Marshal(view.ManualGrant)
			if view.Plan != tt.wantPlan || view.Status != tt.wantStatus || string(grant) != tt.wantGrant {
				t.Errorf("view = %s %s %s, want %s %s %s", view.Plan, view.Status, grant, tt.wantPlan, tt.wantStatus, tt.wantGrant)
			}
		})
	}
}
