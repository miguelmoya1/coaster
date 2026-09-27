package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// EstablishmentSubscriptionRepository keeps what each establishment pays for. The finders
// return nil with a nil error when there is no row.
type EstablishmentSubscriptionRepository interface {
	FindByEstablishmentID(ctx context.Context, establishmentID string) (*domain.EstablishmentSubscription, error)
	FindByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*domain.EstablishmentSubscription, error)
	FindByStripeSubscriptionID(ctx context.Context, stripeSubscriptionID string) (*domain.EstablishmentSubscription, error)
	// CountBillableSeats counts the active members, and never less than one.
	CountBillableSeats(ctx context.Context, establishmentID string) (int, error)
	UpdateStatus(ctx context.Context, establishmentID string, status domain.SubscriptionStatus) error
	// Upsert writes the Stripe state on the establishment's row, creating it if needed. A
	// Stripe customer or subscription still linked to another establishment is unlinked
	// from it first, in the same transaction.
	Upsert(ctx context.Context, establishmentID string, data domain.SubscriptionUpsert) error
	// UpdateFromStripe writes what Stripe says about a lapsed subscription, keeping the plan.
	UpdateFromStripe(ctx context.Context, establishmentID string, snapshot domain.SubscriptionSnapshot) error
}
