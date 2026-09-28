package domain

import (
	"testing"
	"time"
)

func TestSubscriptionGrantsAccess(t *testing.T) {
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	future := &Time{Time: now.Add(24 * time.Hour)}
	past := &Time{Time: now.Add(-24 * time.Hour)}
	stripeID := "sub_123"
	pro := PlanPro
	free := PlanFree

	tests := []struct {
		name  string
		state *SubscriptionState
		want  bool
	}{
		{name: "no subscription row", state: nil, want: false},
		{name: "active with a current Stripe period", state: &SubscriptionState{Status: SubscriptionActive, StripeSubscriptionID: &stripeID, CurrentPeriodEnd: future}, want: true},
		{name: "active past its period", state: &SubscriptionState{Status: SubscriptionActive, StripeSubscriptionID: &stripeID, CurrentPeriodEnd: past}, want: false},
		{name: "active without Stripe", state: &SubscriptionState{Status: SubscriptionActive, CurrentPeriodEnd: future}, want: false},
		{name: "trial running", state: &SubscriptionState{Status: SubscriptionTrialing, TrialEndsAt: future}, want: true},
		{name: "trial over", state: &SubscriptionState{Status: SubscriptionTrialing, TrialEndsAt: past}, want: false},
		{name: "past due while Stripe retries", state: &SubscriptionState{Status: SubscriptionPastDue}, want: true},
		{name: "unpaid", state: &SubscriptionState{Status: SubscriptionUnpaid}, want: false},
		{name: "canceled until its period ends", state: &SubscriptionState{Status: SubscriptionCanceled, CurrentPeriodEnd: future}, want: true},
		{name: "canceled after its period", state: &SubscriptionState{Status: SubscriptionCanceled, CurrentPeriodEnd: past}, want: false},
		{name: "inactive", state: &SubscriptionState{Status: SubscriptionInactive}, want: false},
		{name: "expired", state: &SubscriptionState{Status: SubscriptionExpired}, want: false},
		{name: "open-ended manual grant", state: &SubscriptionState{Status: SubscriptionInactive, ManualPlan: &pro}, want: true},
		{name: "dated manual grant still running", state: &SubscriptionState{Status: SubscriptionInactive, ManualPlan: &pro, ManualGrantExpiresAt: future}, want: true},
		{name: "manual grant run out", state: &SubscriptionState{Status: SubscriptionExpired, ManualPlan: &pro, ManualGrantExpiresAt: past}, want: false},
		{name: "manual FREE grants nothing", state: &SubscriptionState{Status: SubscriptionExpired, ManualPlan: &free}, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SubscriptionGrantsAccess(tt.state, now); got != tt.want {
				t.Errorf("SubscriptionGrantsAccess = %v, want %v", got, tt.want)
			}
		})
	}
}
