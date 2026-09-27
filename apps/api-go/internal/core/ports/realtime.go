package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// Realtime sends a message to everyone connected to an establishment's stream
// (RealtimeService in Nest). event is one of the domain.Realtime* names and payload is
// written as JSON.
type Realtime interface {
	Publish(establishmentID string, event string, payload any)
	// Revoke closes the streams a person has open on an establishment.
	Revoke(establishmentID string, userID string)
}

// RealtimeSubscriber is one open stream (RealtimeSubscriber in Nest).
type RealtimeSubscriber interface {
	UserID() string
	// Deliver hands a frame to the stream. It must not block.
	Deliver(frame domain.RealtimeFrame)
	// Close ends the stream. It can be called more than once.
	Close()
}

// RealtimeBus shares frames and revocations with the other instances and keeps the last
// two minutes of frames for replay (RealtimeBus in Nest). Without Redis it does nothing,
// and a frame reaches only the streams of this instance.
type RealtimeBus interface {
	PublishEvent(establishmentID string, frame domain.RealtimeFrame)
	PublishRevoke(establishmentID string, userID string)
	Remember(establishmentID string, frame domain.RealtimeFrame)
	// Replay returns the frames from sinceID on, sinceID included.
	Replay(ctx context.Context, establishmentID string, sinceID string) []domain.RealtimeFrame
}
