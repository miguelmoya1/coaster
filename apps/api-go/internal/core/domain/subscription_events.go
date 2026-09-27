package domain

import "time"

// The events of establishment-subscription/events/impl. Name() is the class name in Nest.

const (
	SubscriptionActivatedEventName         = "SubscriptionActivatedEvent"
	SubscriptionCancelledEventName         = "SubscriptionCancelledEvent"
	SubscriptionOverriddenEventName        = "SubscriptionOverriddenEvent"
	SubscriptionPaymentFailedEventName     = "SubscriptionPaymentFailedEvent"
	SubscriptionRenewedEventName           = "SubscriptionRenewedEvent"
	DuplicateSubscriptionDetectedEventName = "DuplicateSubscriptionDetectedEvent"
)

// SubscriptionEventNames are the events that change what an establishment pays for.
var SubscriptionEventNames = []string{
	SubscriptionActivatedEventName,
	SubscriptionCancelledEventName,
	SubscriptionOverriddenEventName,
	SubscriptionPaymentFailedEventName,
	SubscriptionRenewedEventName,
}

// SubscriptionActivated: a Checkout finished and the subscription is linked.
type SubscriptionActivated struct {
	EstablishmentID      string
	StripeSubscriptionID string
}

func (SubscriptionActivated) Name() string { return SubscriptionActivatedEventName }

// SubscriptionCancelled: the subscription ended or will end.
type SubscriptionCancelled struct {
	EstablishmentID      string
	StripeSubscriptionID string
	CanceledAt           *time.Time
}

func (SubscriptionCancelled) Name() string { return SubscriptionCancelledEventName }

// SubscriptionOverridden: an admin granted or revoked a plan by hand.
type SubscriptionOverridden struct {
	EstablishmentID string
}

func (SubscriptionOverridden) Name() string { return SubscriptionOverriddenEventName }

// SubscriptionPaymentFailed: Stripe could not charge an invoice.
type SubscriptionPaymentFailed struct {
	EstablishmentID  string
	StripeCustomerID string
}

func (SubscriptionPaymentFailed) Name() string { return SubscriptionPaymentFailedEventName }

// SubscriptionRenewed: the subscription is active or trialing again.
type SubscriptionRenewed struct {
	EstablishmentID      string
	StripeSubscriptionID string
	CurrentPeriodEnd     *time.Time
}

func (SubscriptionRenewed) Name() string { return SubscriptionRenewedEventName }

// DuplicateSubscriptionDetected: a second Checkout was paid and its subscription cancelled.
type DuplicateSubscriptionDetected struct {
	EstablishmentID         string
	KeptSubscriptionID      string
	CancelledSubscriptionID string
}

func (DuplicateSubscriptionDetected) Name() string { return DuplicateSubscriptionDetectedEventName }
