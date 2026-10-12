package ports

import (
	"context"
	"time"

	"coaster-api/internal/core/domain"
)

type StatsRepository interface {
	FindClosedOrders(ctx context.Context, establishmentID string, since time.Time) ([]domain.StatsOrder, error)
}

type StatsService interface {
	EstablishmentStats(ctx context.Context, establishmentID string, includeHistory bool) (domain.EstablishmentStats, error)
}
