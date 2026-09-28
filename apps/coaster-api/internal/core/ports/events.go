package ports

import "context"

type Event interface {
	Name() string
}

type EventPublisher interface {
	Publish(ctx context.Context, event Event)
}
