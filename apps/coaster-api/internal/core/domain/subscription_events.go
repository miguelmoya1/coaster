package domain

import "time"

type SubscriptionActivatedEvent struct {
	EstablishmentID      string
	StripeSubscriptionID string
}

type SubscriptionCancelledEvent struct {
	EstablishmentID      string
	StripeSubscriptionID string
	CanceledAt           *time.Time
}

type SubscriptionOverriddenEvent struct {
	EstablishmentID string
}

type SubscriptionPaymentFailedEvent struct {
	EstablishmentID  string
	StripeCustomerID string
}

type SubscriptionRenewedEvent struct {
	EstablishmentID      string
	StripeSubscriptionID string
	CurrentPeriodEnd     *time.Time
}

type DuplicateSubscriptionDetectedEvent struct {
	EstablishmentID         string
	KeptSubscriptionID      string
	CancelledSubscriptionID string
}
