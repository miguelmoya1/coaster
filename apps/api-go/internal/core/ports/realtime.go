package ports

import (
	"context"

	"api-go/internal/core/domain"
)

type Realtime interface {
	Publish(establishmentID string, event string, payload any)

	Revoke(establishmentID string, userID string)
}

type RealtimeSubscriber interface {
	UserID() string

	Deliver(frame domain.RealtimeFrame)

	Close()
}

type RealtimeBus interface {
	PublishEvent(establishmentID string, frame domain.RealtimeFrame)
	PublishRevoke(establishmentID string, userID string)
	Remember(establishmentID string, frame domain.RealtimeFrame)

	Replay(ctx context.Context, establishmentID string, sinceID string) []domain.RealtimeFrame
}

type RealtimeService interface {
	Watch(establishmentID string, subscriber RealtimeSubscriber) func()
	Replay(ctx context.Context, establishmentID string, lastEventID string) []domain.RealtimeFrame
}
