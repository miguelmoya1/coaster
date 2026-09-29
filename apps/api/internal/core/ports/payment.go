package ports

import (
	"context"

	"coaster-api/internal/core/domain"
)

type PaymentGateway interface {
	CreateCheckoutSession(ctx context.Context, request domain.CheckoutRequest) (*domain.StripeCheckoutSession, error)

	CancelSubscription(ctx context.Context, subscriptionID string) (bool, error)

	CreateBillingPortalSession(ctx context.Context, customerID, returnURL string) (string, error)

	RetrieveSubscription(ctx context.Context, subscriptionID string) (*domain.StripeSubscription, error)

	UpdateSubscriptionSeats(ctx context.Context, subscriptionID string, seats int, priceID string) (bool, error)

	ParseWebhook(payload []byte, signature string) (*domain.StripeEvent, error)
}
