package repository

import (
	"context"
	_ "embed"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/admin_metrics/count_establishments.sql
	countEstablishmentMetricsQuery string
	//go:embed queries/admin_metrics/count_users.sql
	countUserMetricsQuery string
	//go:embed queries/admin_metrics/count_subscriptions_by_status.sql
	countSubscriptionsByStatusQuery string
	//go:embed queries/admin_metrics/count_subscriptions_by_plan.sql
	countSubscriptionsByPlanQuery string
	//go:embed queries/admin_metrics/count_subscription_access.sql
	countSubscriptionAccessQuery string
	//go:embed queries/admin_metrics/order_activity.sql
	orderActivityQuery string
)

type AdminMetricsRepository struct {
	pool *pgxpool.Pool
}

func NewAdminMetricsRepository(pool *pgxpool.Pool) *AdminMetricsRepository {
	return &AdminMetricsRepository{pool: pool}
}

func (r *AdminMetricsRepository) Collect(ctx context.Context, now, last7Days, last30Days time.Time) (domain.AdminPlatformMetrics, error) {
	var metrics domain.AdminPlatformMetrics
	now, last7Days, last30Days = now.UTC(), last7Days.UTC(), last30Days.UTC()

	establishments := &metrics.Establishments
	err := r.pool.QueryRow(ctx, countEstablishmentMetricsQuery, last7Days, last30Days).Scan(
		&establishments.Total, &establishments.CreatedLast7Days, &establishments.CreatedLast30Days,
	)
	if err != nil {
		return metrics, err
	}

	users := &metrics.Users
	err = r.pool.QueryRow(ctx, countUserMetricsQuery, last30Days).Scan(
		&users.Total, &users.Active, &users.Admins, &users.CreatedLast30Days,
	)
	if err != nil {
		return metrics, err
	}

	subscriptions := &metrics.Subscriptions
	if err := r.countGroups(ctx, countSubscriptionsByStatusQuery, func(status string, count int) {
		subscriptions.ByStatus.Set(domain.SubscriptionStatus(status), count)
	}); err != nil {
		return metrics, err
	}
	if err := r.countGroups(ctx, countSubscriptionsByPlanQuery, func(plan string, count int) {
		subscriptions.ByPlan.Set(domain.SubscriptionPlan(plan), count)
	}); err != nil {
		return metrics, err
	}

	err = r.pool.QueryRow(ctx, countSubscriptionAccessQuery, now).Scan(
		&subscriptions.Manual, &subscriptions.Stripe, &subscriptions.WithAccess,
	)
	if err != nil {
		return metrics, err
	}

	activity := &metrics.Activity
	err = r.pool.QueryRow(ctx, orderActivityQuery, last30Days).Scan(&activity.OrdersLast30Days, &activity.RevenueLast30Days)
	return metrics, err
}

func (r *AdminMetricsRepository) countGroups(ctx context.Context, query string, set func(value string, count int)) error {
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return err
	}

	var value string
	var count int
	_, err = pgx.ForEachRow(rows, []any{&value, &count}, func() error {
		set(value, count)
		return nil
	})
	return err
}
