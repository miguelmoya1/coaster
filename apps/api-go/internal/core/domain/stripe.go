package domain

import "time"

// What the service needs to know about Stripe's objects. The payment adapter turns
// stripe-go's types into these, so the service never imports stripe-go.

// Stripe subscription statuses (Subscription.Status in Stripe).
const (
	StripeStatusActive            = "active"
	StripeStatusTrialing          = "trialing"
	StripeStatusPastDue           = "past_due"
	StripeStatusCanceled          = "canceled"
	StripeStatusUnpaid            = "unpaid"
	StripeStatusIncompleteExpired = "incomplete_expired"
)

// StripeSubscription is a subscription as Stripe reports it.
type StripeSubscription struct {
	ID                string
	Status            string
	CustomerID        string
	Metadata          map[string]string
	Items             []StripeSubscriptionItem
	CancelAtPeriodEnd bool
	// CancelAt, TrialEnd and CanceledAt are nil when Stripe sends nothing (or 0).
	CancelAt   *time.Time
	TrialEnd   *time.Time
	CanceledAt *time.Time
}

// StripeSubscriptionItem is one line of a subscription: a price and how many of it.
type StripeSubscriptionItem struct {
	ID                 string
	PriceID            string
	Quantity           int
	CurrentPeriodStart *time.Time
	CurrentPeriodEnd   *time.Time
}

// IsLive reports whether the subscription can still bill (isLiveSubscription in Nest).
func (s *StripeSubscription) IsLive() bool {
	return s.Status != StripeStatusCanceled && s.Status != StripeStatusIncompleteExpired
}

// StripeCheckoutSession is a finished (or new) Checkout session.
type StripeCheckoutSession struct {
	ID                string
	URL               string
	Mode              string
	ClientReferenceID string
	Metadata          map[string]string
	CustomerID        string
	SubscriptionID    string
}

// StripeInvoice is the part of an invoice the webhooks read.
type StripeInvoice struct {
	ID             string
	CustomerID     string
	SubscriptionID string
}

// Stripe webhook event types the API reacts to.
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

// StripeCheckoutModeSubscription is the Checkout mode of a subscription purchase.
const StripeCheckoutModeSubscription = "subscription"

// StripeEvent is a verified webhook event. Only the object of its type is set.
type StripeEvent struct {
	ID              string
	Type            string
	CheckoutSession *StripeCheckoutSession
	Subscription    *StripeSubscription
	Invoice         *StripeInvoice
}

// CheckoutRequest is the Checkout session the service asks Stripe for.
type CheckoutRequest struct {
	SuccessURL            string
	CancelURL             string
	ClientReferenceID     string
	PriceID               string
	Quantity              int
	ExpiresAt             time.Time
	IntegrationIdentifier string
	// Metadata goes on the session and on the subscription it creates.
	Metadata map[string]string
	// CustomerID is the Stripe customer to reuse, or "" to let Checkout create one.
	CustomerID string
	// IdempotencyKey makes a repeated purchase get the same session back.
	IdempotencyKey string
}
