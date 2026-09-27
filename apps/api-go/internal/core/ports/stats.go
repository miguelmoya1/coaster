package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// StatsRepository reads the orders the stats add up.
type StatsRepository interface {
	// FindClosedOrders lists the establishment's closed orders created at since or later,
	// the oldest first.
	FindClosedOrders(ctx context.Context, establishmentID string, since time.Time) ([]domain.StatsOrder, error)
}
