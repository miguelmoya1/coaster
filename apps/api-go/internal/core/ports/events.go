package ports

import "context"

// Event is something that already happened and was saved in the database.
// Name identifies it for the subscribers, for example "order.created".
type Event interface {
	Name() string
}

// EventPublisher tells the subscribers (realtime, audit, cache) that something happened.
// Services call Publish after saving, never before.
type EventPublisher interface {
	Publish(ctx context.Context, event Event)
}
