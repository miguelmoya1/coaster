package domain

import "time"

const (
	SubscriptionActivatedEventName         = "SubscriptionActivatedEvent"
	SubscriptionCancelledEventName         = "SubscriptionCancelledEvent"
	SubscriptionOverriddenEventName        = "SubscriptionOverriddenEvent"
	SubscriptionPaymentFailedEventName     = "SubscriptionPaymentFailedEvent"
	SubscriptionRenewedEventName           = "SubscriptionRenewedEvent"
	DuplicateSubscriptionDetectedEventName = "DuplicateSubscriptionDetectedEvent"
)

var SubscriptionEventNames = []string{
	SubscriptionActivatedEventName,
	SubscriptionCancelledEventName,
	SubscriptionOverriddenEventName,
	SubscriptionPaymentFailedEventName,
	SubscriptionRenewedEventName,
}

type SubscriptionActivated struct {
	EstablishmentID      string
	StripeSubscriptionID string
}

func (SubscriptionActivated) Name() string { return SubscriptionActivatedEventName }

type SubscriptionCancelled struct {
	EstablishmentID      string
	StripeSubscriptionID string
	CanceledAt           *time.Time
}

func (SubscriptionCancelled) Name() string { return SubscriptionCancelledEventName }

type SubscriptionOverridden struct {
	EstablishmentID string
}

func (SubscriptionOverridden) Name() string { return SubscriptionOverriddenEventName }

type SubscriptionPaymentFailed struct {
	EstablishmentID  string
	StripeCustomerID string
}

func (SubscriptionPaymentFailed) Name() string { return SubscriptionPaymentFailedEventName }

type SubscriptionRenewed struct {
	EstablishmentID      string
	StripeSubscriptionID string
	CurrentPeriodEnd     *time.Time
}

func (SubscriptionRenewed) Name() string { return SubscriptionRenewedEventName }

type DuplicateSubscriptionDetected struct {
	EstablishmentID         string
	KeptSubscriptionID      string
	CancelledSubscriptionID string
}

func (DuplicateSubscriptionDetected) Name() string { return DuplicateSubscriptionDetectedEventName }
