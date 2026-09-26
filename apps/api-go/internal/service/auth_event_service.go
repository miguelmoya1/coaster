package service

import (
	"context"
	"log/slog"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// AuthEventService keeps the auth log.
type AuthEventService struct {
	events ports.AuthEventRepository
}

func NewAuthEventService(events ports.AuthEventRepository) *AuthEventService {
	return &AuthEventService{events: events}
}

// Record writes an AuthEventOccurred down. It subscribes to the EventPublisher. A failure
// is logged and swallowed: nobody loses their login over the log.
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

// RecentOf lists a user's latest auth events, newest first.
func (s *AuthEventService) RecentOf(ctx context.Context, userID string, limit int) ([]domain.AuthEventRecord, error) {
	return s.events.FindRecentOf(ctx, userID, limit)
}
