package domain

import "time"

const (
	StripeStatusActive            = "active"
	StripeStatusTrialing          = "trialing"
	StripeStatusPastDue           = "past_due"
	StripeStatusCanceled          = "canceled"
	StripeStatusUnpaid            = "unpaid"
	StripeStatusIncompleteExpired = "incomplete_expired"
)

type StripeSubscription struct {
	ID                string
	Status            string
	CustomerID        string
	Metadata          map[string]string
	Items             []StripeSubscriptionItem
	CancelAtPeriodEnd bool

	CancelAt   *time.Time
	TrialEnd   *time.Time
	CanceledAt *time.Time
}

type StripeSubscriptionItem struct {
	ID                 string
	PriceID            string
	Quantity           int
	CurrentPeriodStart *time.Time
	CurrentPeriodEnd   *time.Time
}

func (s *StripeSubscription) IsLive() bool {
	return s.Status != StripeStatusCanceled && s.Status != StripeStatusIncompleteExpired
}

type StripeCheckoutSession struct {
	ID                string
	URL               string
	Mode              string
	ClientReferenceID string
	Metadata          map[string]string
	CustomerID        string
	SubscriptionID    string
}

type StripeInvoice struct {
	ID             string
	CustomerID     string
	SubscriptionID string
}

const (
	StripeEventCheckoutCompleted    = "checkout.session.completed"
	StripeEventSubscriptionCreated  = "customer.subscription.created"
	StripeEventSubscriptionUpdated  = "customer.subscription.updated"
	StripeEventSubscriptionDeleted  = "customer.subscription.deleted"
	StripeEventSubscriptionPaused   = "customer.subscription.paused"
	StripeEventSubscriptionResumed  = "customer.subscription.resumed"
	StripeEventInvoicePaid          = "invoice.paid"
	StripeEventInvoicePaymentFailed = "invoice.payment_failed"
)

const StripeCheckoutModeSubscription = "subscription"

type StripeEvent struct {
	ID              string
	Type            string
	CheckoutSession *StripeCheckoutSession
	Subscription    *StripeSubscription
	Invoice         *StripeInvoice
}

type CheckoutRequest struct {
	SuccessURL            string
	CancelURL             string
	ClientReferenceID     string
	PriceID               string
	Quantity              int
	ExpiresAt             time.Time
	IntegrationIdentifier string

	Metadata map[string]string

	CustomerID string

	IdempotencyKey string
}
