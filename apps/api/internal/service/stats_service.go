package service

import (
	"context"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type StatsService struct {
	stats ports.StatsRepository
	now   func() time.Time
}

func NewStatsService(stats ports.StatsRepository) *StatsService {
	return &StatsService{stats: stats, now: time.Now}
}

func (s *StatsService) EstablishmentStats(ctx context.Context, establishmentID string, includeHistory bool) (domain.EstablishmentStats, error) {
	now := domain.InEstablishmentZone(s.now())

	orders, err := s.stats.FindClosedOrders(ctx, establishmentID, domain.StatsSince(now, includeHistory))
	if err != nil {
		return domain.EstablishmentStats{}, err
	}

	return domain.EstablishmentStatsOf(orders, now, includeHistory), nil
}
