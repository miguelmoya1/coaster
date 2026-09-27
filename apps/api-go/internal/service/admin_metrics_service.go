package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// AdminMetricsService is the backoffice's front page: how the platform is doing.
type AdminMetricsService struct {
	metrics ports.AdminMetricsRepository
	now     func() time.Time
}

func NewAdminMetricsService(metrics ports.AdminMetricsRepository) *AdminMetricsService {
	return &AdminMetricsService{metrics: metrics, now: time.Now}
}

// Overview is GetPlatformMetricsQuery: the counts now, and over the last 7 and 30 days.
func (s *AdminMetricsService) Overview(ctx context.Context) (domain.AdminPlatformMetrics, error) {
	now := s.now()
	return s.metrics.Collect(ctx, now, now.Add(-7*adminDay), now.Add(-30*adminDay))
}

// adminDay is a day as utils/pagination.ts counts them: 24 hours.
const adminDay = 24 * time.Hour
