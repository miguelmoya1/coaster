package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type EstablishmentSubscriptionRepository interface {
	FindByEstablishmentID(ctx context.Context, establishmentID string) (*domain.EstablishmentSubscription, error)
	FindByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*domain.EstablishmentSubscription, error)
	FindByStripeSubscriptionID(ctx context.Context, stripeSubscriptionID string) (*domain.EstablishmentSubscription, error)

	CountBillableSeats(ctx context.Context, establishmentID string) (int, error)
	UpdateStatus(ctx context.Context, establishmentID string, status domain.SubscriptionStatus) error

	Upsert(ctx context.Context, establishmentID string, data domain.SubscriptionUpsert) error

	UpdateFromStripe(ctx context.Context, establishmentID string, snapshot domain.SubscriptionSnapshot) error
}
