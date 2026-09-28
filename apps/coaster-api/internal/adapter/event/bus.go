package event

import (
	"context"
	"log/slog"
	"reflect"
	"sync"

	"coaster-api/internal/core/ports"
)

type Bus struct {
	mu       sync.RWMutex
	handlers map[reflect.Type][]ports.EventHandler
	running  sync.WaitGroup
}

func NewBus() *Bus {
	return &Bus{handlers: make(map[reflect.Type][]ports.EventHandler)}
}

func (b *Bus) Subscribe(handlers ...ports.EventHandler) {
	b.mu.Lock()
	defer b.mu.Unlock()

	for _, handler := range handlers {
		b.handlers[handler.Event] = append(b.handlers[handler.Event], handler)
	}
}

func (b *Bus) Publish(ctx context.Context, event any) {
	b.mu.RLock()
	handlers := b.handlers[reflect.TypeOf(event)]
	b.mu.RUnlock()

	ctx = context.WithoutCancel(ctx)

	for _, handler := range handlers {
		b.running.Go(func() {
			defer func() {
				if recovered := recover(); recovered != nil {
					slog.Error("event handler panicked", "event", handler.Event.String(), "panic", recovered)
				}
			}()
			handler.Handle(ctx, event)
		})
	}
}

func (b *Bus) Wait() {
	b.running.Wait()
}
