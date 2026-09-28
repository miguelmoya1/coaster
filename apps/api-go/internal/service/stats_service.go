package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// StatsService adds up the revenue of an establishment for its dashboard.
type StatsService struct {
	stats ports.StatsRepository
	now   func() time.Time
}

func NewStatsService(stats ports.StatsRepository) *StatsService {
	return &StatsService{stats: stats, now: time.Now}
}

// EstablishmentStats is GetEstablishmentStatsQuery: today, yesterday, this week and, with
// includeHistory, this month, last month and this year. Without the history it does not even
// read the orders of the year. The days are those of the establishment's zone (Europe/Madrid).
func (s *StatsService) EstablishmentStats(ctx context.Context, establishmentID string, includeHistory bool) (domain.EstablishmentStats, error) {
	now := domain.InEstablishmentZone(s.now())

	orders, err := s.stats.FindClosedOrders(ctx, establishmentID, domain.StatsSince(now, includeHistory))
	if err != nil {
		return domain.EstablishmentStats{}, err
	}

	return domain.EstablishmentStatsOf(orders, now, includeHistory), nil
}
