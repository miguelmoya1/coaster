package domain

import "time"

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

type SubscriptionPlan string

const (
	PlanFree SubscriptionPlan = "FREE"
	PlanPro  SubscriptionPlan = "PRO"
)

type SubscriptionState struct {
	Status               SubscriptionStatus `json:"status"`
	StripeSubscriptionID *string            `json:"stripeSubscriptionId"`
	CurrentPeriodEnd     *Time              `json:"currentPeriodEnd"`
	TrialEndsAt          *Time              `json:"trialEndsAt"`
	ManualPlan           *SubscriptionPlan  `json:"manualPlan"`
	ManualGrantExpiresAt *Time              `json:"manualGrantExpiresAt"`
}

func IsManualGrantActive(state *SubscriptionState, now time.Time) bool {
	if state == nil || state.ManualPlan == nil || *state.ManualPlan == PlanFree {
		return false
	}

	return state.ManualGrantExpiresAt == nil || !now.After(state.ManualGrantExpiresAt.Time)
}

func SubscriptionGrantsAccess(state *SubscriptionState, now time.Time) bool {
	return IsManualGrantActive(state, now) || stripeGrantsAccess(state, now)
}

func stripeGrantsAccess(state *SubscriptionState, now time.Time) bool {
	if state == nil {
		return false
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

func notAfter(now time.Time, end *Time) bool {
	return end != nil && !now.After(end.Time)
}
