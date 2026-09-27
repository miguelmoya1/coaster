package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// PaymentGateway is Stripe (StripeApi and StripeWebhookGuard in Nest). Its errors are
// already the domain errors Nest answers with.
type PaymentGateway interface {
	// CreateCheckoutSession retries without the customer when Stripe no longer knows it.
	CreateCheckoutSession(ctx context.Context, request domain.CheckoutRequest) (*domain.StripeCheckoutSession, error)
	// CancelSubscription reports false when Stripe does not know the subscription.
	CancelSubscription(ctx context.Context, subscriptionID string) (bool, error)
	// CreateBillingPortalSession returns "" when Stripe does not know the customer.
	CreateBillingPortalSession(ctx context.Context, customerID, returnURL string) (string, error)
	// RetrieveSubscription returns nil when Stripe does not know the subscription.
	RetrieveSubscription(ctx context.Context, subscriptionID string) (*domain.StripeSubscription, error)
	// UpdateSubscriptionSeats sets the quantity of the item on priceID. It reports false
	// when there was nothing to change.
	UpdateSubscriptionSeats(ctx context.Context, subscriptionID string, seats int, priceID string) (bool, error)
	// ParseWebhook checks the Stripe-Signature of a webhook body and reads the event.
	ParseWebhook(payload []byte, signature string) (*domain.StripeEvent, error)
}
