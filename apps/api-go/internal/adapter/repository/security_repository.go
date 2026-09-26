package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/security/user_role.sql
	userRoleQuery string
	//go:embed queries/security/membership.sql
	membershipQuery string
	//go:embed queries/security/enabled_modules.sql
	enabledModulesQuery string
	//go:embed queries/security/subscription_state.sql
	subscriptionStateQuery string
)

// SecurityRepository reads what the route checks need.
type SecurityRepository struct {
	pool *pgxpool.Pool
}

func NewSecurityRepository(pool *pgxpool.Pool) *SecurityRepository {
	return &SecurityRepository{pool: pool}
}

func (r *SecurityRepository) UserRole(ctx context.Context, userID string) (domain.Role, error) {
	var role string

	err := r.pool.QueryRow(ctx, userRoleQuery, userID).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}

	return domain.Role(role), err
}

func (r *SecurityRepository) Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error) {
	var membership domain.Membership

	err := r.pool.QueryRow(ctx, membershipQuery, userID, establishmentID).Scan(&membership.Role, &membership.Active)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &membership, nil
}

func (r *SecurityRepository) EnabledModules(ctx context.Context, establishmentID string) ([]domain.EstablishmentModule, bool, error) {
	var stored []string

	err := r.pool.QueryRow(ctx, enabledModulesQuery, establishmentID).Scan(&stored)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	modules := make([]domain.EstablishmentModule, 0, len(stored))
	for _, module := range stored {
		modules = append(modules, domain.EstablishmentModule(module))
	}

	return modules, true, nil
}

func (r *SecurityRepository) SubscriptionState(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error) {
	var state domain.SubscriptionState
	var status string
	var manualPlan *string
	var currentPeriodEnd, trialEndsAt, manualGrantExpiresAt *time.Time

	err := r.pool.QueryRow(ctx, subscriptionStateQuery, establishmentID).Scan(
		&status, &state.StripeSubscriptionID, &currentPeriodEnd, &trialEndsAt, &manualPlan, &manualGrantExpiresAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	state.Status = domain.SubscriptionStatus(status)
	state.CurrentPeriodEnd = timeOrNil(currentPeriodEnd)
	state.TrialEndsAt = timeOrNil(trialEndsAt)
	state.ManualGrantExpiresAt = timeOrNil(manualGrantExpiresAt)
	if manualPlan != nil {
		plan := domain.SubscriptionPlan(*manualPlan)
		state.ManualPlan = &plan
	}

	return &state, nil
}

// timeOrNil turns an optional column into an optional domain.Time.
func timeOrNil(t *time.Time) *domain.Time {
	if t == nil {
		return nil
	}
	return &domain.Time{Time: *t}
}
