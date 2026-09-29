package ports

import (
	"context"
	"reflect"
)

type EventPublisher interface {
	Publish(ctx context.Context, event any)
}

type EventSubscriber interface {
	EventHandlers() []EventHandler
}

type EventHandler struct {
	Event  reflect.Type
	Handle func(ctx context.Context, event any)
}

func On[E any](handle func(ctx context.Context, event E)) EventHandler {
	return EventHandler{
		Event:  reflect.TypeFor[E](),
		Handle: func(ctx context.Context, event any) { handle(ctx, event.(E)) },
	}
}
