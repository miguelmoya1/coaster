package repository

import (
	"context"
	_ "embed"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

//go:embed queries/stats/find_closed_orders.sql
var findClosedOrdersForStatsQuery string

type StatsRepository struct {
	pool *pgxpool.Pool
}

func NewStatsRepository(pool *pgxpool.Pool) *StatsRepository {
	return &StatsRepository{pool: pool}
}

func (r *StatsRepository) FindClosedOrders(ctx context.Context, establishmentID string, since time.Time) ([]domain.StatsOrder, error) {
	rows, err := r.pool.Query(ctx, findClosedOrdersForStatsQuery, establishmentID, since.UTC())
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.StatsOrder, error) {
		var order domain.StatsOrder
		err := row.Scan(&order.AmountPaidCash, &order.AmountPaidCard, &order.TipAmount, &order.CreatedAt)
		return order, err
	})
}
