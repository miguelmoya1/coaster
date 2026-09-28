package service

import (
	"context"
	"log/slog"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type AuthEventService struct {
	events ports.AuthEventRepository
}

func NewAuthEventService(events ports.AuthEventRepository) *AuthEventService {
	return &AuthEventService{events: events}
}

func (s *AuthEventService) Record(ctx context.Context, event ports.Event) {
	occurred, ok := event.(domain.AuthEventOccurred)
	if !ok {
		return
	}

	if err := s.events.Record(ctx, occurred); err != nil {
		who := occurred.UserID
		if who == "" {
			who = occurred.Email
		}
		if who == "" {
			who = "nobody in particular"
		}

		slog.Error("failed to record an auth event; it happened all the same and is now unlogged",
			"type", occurred.Type, "who", who, "error", err)
	}
}

func (s *AuthEventService) RecentOf(ctx context.Context, userID string, limit int) ([]domain.AuthEventRecord, error) {
	return s.events.FindRecentOf(ctx, userID, limit)
}
