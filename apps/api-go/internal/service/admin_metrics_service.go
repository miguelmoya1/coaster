package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type AdminMetricsService struct {
	metrics ports.AdminMetricsRepository
	now     func() time.Time
}

func NewAdminMetricsService(metrics ports.AdminMetricsRepository) *AdminMetricsService {
	return &AdminMetricsService{metrics: metrics, now: time.Now}
}

func (s *AdminMetricsService) Overview(ctx context.Context) (domain.AdminPlatformMetrics, error) {
	now := s.now()
	return s.metrics.Collect(ctx, now, now.Add(-7*adminDay), now.Add(-30*adminDay))
}

const adminDay = 24 * time.Hour
