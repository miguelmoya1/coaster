package repository

import (
	"context"
	_ "embed"
	"errors"
	"log/slog"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/establishment_subscription/find_by_establishment.sql
	findSubscriptionByEstablishmentQuery string
	//go:embed queries/establishment_subscription/find_by_stripe_customer.sql
	findSubscriptionByStripeCustomerQuery string
	//go:embed queries/establishment_subscription/find_by_stripe_subscription.sql
	findSubscriptionByStripeSubscriptionQuery string
	//go:embed queries/establishment_subscription/count_billable_seats.sql
	countBillableSeatsQuery string
	//go:embed queries/establishment_subscription/update_status.sql
	updateSubscriptionStatusQuery string
	//go:embed queries/establishment_subscription/release_stripe_customer.sql
	releaseStripeCustomerQuery string
	//go:embed queries/establishment_subscription/release_stripe_subscription.sql
	releaseStripeSubscriptionQuery string
	//go:embed queries/establishment_subscription/upsert.sql
	upsertSubscriptionQuery string
	//go:embed queries/establishment_subscription/upsert_links.sql
	upsertSubscriptionLinksQuery string
	//go:embed queries/establishment_subscription/update_from_stripe.sql
	updateSubscriptionFromStripeQuery string
)

type EstablishmentSubscriptionRepository struct {
	pool *pgxpool.Pool
}

func NewEstablishmentSubscriptionRepository(pool *pgxpool.Pool) *EstablishmentSubscriptionRepository {
	return &EstablishmentSubscriptionRepository{pool: pool}
}

func (r *EstablishmentSubscriptionRepository) FindByEstablishmentID(ctx context.Context, establishmentID string) (*domain.EstablishmentSubscription, error) {
	return r.findOne(ctx, findSubscriptionByEstablishmentQuery, establishmentID)
}

func (r *EstablishmentSubscriptionRepository) FindByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*domain.EstablishmentSubscription, error) {
	return r.findOne(ctx, findSubscriptionByStripeCustomerQuery, stripeCustomerID)
}

func (r *EstablishmentSubscriptionRepository) FindByStripeSubscriptionID(ctx context.Context, stripeSubscriptionID string) (*domain.EstablishmentSubscription, error) {
	return r.findOne(ctx, findSubscriptionByStripeSubscriptionQuery, stripeSubscriptionID)
}

func (r *EstablishmentSubscriptionRepository) findOne(ctx context.Context, query string, arg string) (*domain.EstablishmentSubscription, error) {
	var subscription domain.EstablishmentSubscription
	var plan, status string
	var manualPlan *string

	err := r.pool.QueryRow(ctx, query, arg).Scan(
		&subscription.ID, &subscription.EstablishmentID, &plan, &status,
		&subscription.StripeCustomerID, &subscription.StripeSubscriptionID,
		&subscription.CurrentPeriodStart, &subscription.CurrentPeriodEnd, &subscription.TrialEndsAt, &subscription.CanceledAt,
		&subscription.Seats, &manualPlan, &subscription.ManualGrantExpiresAt,
		&subscription.CreatedAt, &subscription.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	subscription.Plan = domain.SubscriptionPlan(plan)
	subscription.Status = domain.SubscriptionStatus(status)
	if manualPlan != nil {
		granted := domain.SubscriptionPlan(*manualPlan)
		subscription.ManualPlan = &granted
	}

	return &subscription, nil
}

func (r *EstablishmentSubscriptionRepository) CountBillableSeats(ctx context.Context, establishmentID string) (int, error) {
	var members int

	if err := r.pool.QueryRow(ctx, countBillableSeatsQuery, establishmentID).Scan(&members); err != nil {
		return 0, err
	}

	return max(members, 1), nil
}

func (r *EstablishmentSubscriptionRepository) UpdateStatus(ctx context.Context, establishmentID string, status domain.SubscriptionStatus) error {
	_, err := r.pool.Exec(ctx, updateSubscriptionStatusQuery, establishmentID, string(status), now())
	return err
}

func (r *EstablishmentSubscriptionRepository) Upsert(ctx context.Context, establishmentID string, data domain.SubscriptionUpsert) error {
	updatedAt := now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if data.StripeCustomerID != "" {
		if err := releaseStripeID(ctx, tx, releaseStripeCustomerQuery, "customer", data.StripeCustomerID, establishmentID); err != nil {
			return err
		}
	}

	if data.StripeSubscriptionID != nil && *data.StripeSubscriptionID != "" {
		if err := releaseStripeID(ctx, tx, releaseStripeSubscriptionQuery, "subscription", *data.StripeSubscriptionID, establishmentID); err != nil {
			return err
		}
	}

	if data.Billing == nil {
		_, err = tx.Exec(ctx, upsertSubscriptionLinksQuery,
			uuid.NewV4().String(), establishmentID, string(data.Plan), string(data.Status),
			nullIfEmpty(data.StripeCustomerID), data.StripeSubscriptionID, updatedAt,
		)
	} else {
		billing := data.Billing
		_, err = tx.Exec(ctx, upsertSubscriptionQuery,
			uuid.NewV4().String(), establishmentID, string(data.Plan), string(data.Status),
			nullIfEmpty(data.StripeCustomerID), data.StripeSubscriptionID, billing.Seats,
			utcOrNil(billing.CurrentPeriodStart), utcOrNil(billing.CurrentPeriodEnd),
			utcOrNil(billing.TrialEndsAt), utcOrNil(billing.CanceledAt), updatedAt,
		)
	}
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func releaseStripeID(ctx context.Context, tx pgx.Tx, query, kind, stripeID, claimedBy string) error {
	rows, err := tx.Query(ctx, query, stripeID, claimedBy, now())
	if err != nil {
		return err
	}

	released, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}

	if len(released) > 0 {
		slog.Error("a Stripe id moved to another establishment and was unlinked from the old ones; they may still be billed by Stripe while losing their billing link: check them by hand",
			"kind", kind, "stripeId", stripeID, "claimedBy", claimedBy, "released", released)
	}

	return nil
}

func (r *EstablishmentSubscriptionRepository) UpdateFromStripe(ctx context.Context, establishmentID string, snapshot domain.SubscriptionSnapshot) error {
	billing := snapshot.Billing

	_, err := r.pool.Exec(ctx, updateSubscriptionFromStripeQuery,
		establishmentID, string(snapshot.Status), snapshot.StripeSubscriptionID, billing.Seats,
		utcOrNil(billing.CurrentPeriodStart), utcOrNil(billing.CurrentPeriodEnd),
		utcOrNil(billing.TrialEndsAt), utcOrNil(billing.CanceledAt), now(),
	)
	return err
}
