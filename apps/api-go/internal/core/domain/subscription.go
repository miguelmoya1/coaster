package domain

import "time"

// SubscriptionStatus mirrors Stripe's status (SubscriptionStatus in the Prisma schema).
type SubscriptionStatus string

const (
	SubscriptionInactive SubscriptionStatus = "INACTIVE"
	SubscriptionTrialing SubscriptionStatus = "TRIALING"
	SubscriptionActive   SubscriptionStatus = "ACTIVE"
	SubscriptionPastDue  SubscriptionStatus = "PAST_DUE"
	SubscriptionCanceled SubscriptionStatus = "CANCELED"
	SubscriptionUnpaid   SubscriptionStatus = "UNPAID"
	SubscriptionExpired  SubscriptionStatus = "EXPIRED"
)

// SubscriptionPlan is FREE or PRO (SubscriptionPlan in the Prisma schema).
type SubscriptionPlan string

const (
	PlanFree SubscriptionPlan = "FREE"
	PlanPro  SubscriptionPlan = "PRO"
)

// SubscriptionState is what the subscription check reads about an establishment.
// The JSON names match what Nest keeps in the cache.
type SubscriptionState struct {
	Status               SubscriptionStatus `json:"status"`
	StripeSubscriptionID *string            `json:"stripeSubscriptionId"`
	CurrentPeriodEnd     *Time              `json:"currentPeriodEnd"`
	TrialEndsAt          *Time              `json:"trialEndsAt"`
	ManualPlan           *SubscriptionPlan  `json:"manualPlan"`
	ManualGrantExpiresAt *Time              `json:"manualGrantExpiresAt"`
}

// IsManualGrantActive reports whether an admin-granted plan is running: a paid plan with no
// end date, or one that has not ended yet.
func IsManualGrantActive(state *SubscriptionState, now time.Time) bool {
	if state == nil || state.ManualPlan == nil || *state.ManualPlan == PlanFree {
		return false
	}

	return state.ManualGrantExpiresAt == nil || !now.After(state.ManualGrantExpiresAt.Time)
}

// SubscriptionGrantsAccess reports whether an establishment may still change things.
func SubscriptionGrantsAccess(state *SubscriptionState, now time.Time) bool {
	if state == nil {
		return false
	}

	if IsManualGrantActive(state, now) {
		return true
	}

	switch state.Status {
	case SubscriptionPastDue:
		return true
	case SubscriptionActive:
		return state.StripeSubscriptionID != nil && *state.StripeSubscriptionID != "" && notAfter(now, state.CurrentPeriodEnd)
	case SubscriptionTrialing:
		return notAfter(now, state.TrialEndsAt)
	case SubscriptionCanceled:
		return notAfter(now, state.CurrentPeriodEnd)
	default:
		return false
	}
}

// notAfter reports whether now is on or before end. A missing end means no.
func notAfter(now time.Time, end *Time) bool {
	return end != nil && !now.After(end.Time)
}
