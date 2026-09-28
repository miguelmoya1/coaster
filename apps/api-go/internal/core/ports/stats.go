package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type StatsRepository interface {
	FindClosedOrders(ctx context.Context, establishmentID string, since time.Time) ([]domain.StatsOrder, error)
}
