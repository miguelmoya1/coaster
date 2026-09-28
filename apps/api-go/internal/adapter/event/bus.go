package event

import (
	"context"
	"log/slog"
	"sync"

	"api-go/internal/core/ports"
)

type Handler func(ctx context.Context, event ports.Event)

type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
	running  sync.WaitGroup
}

func NewBus() *Bus {
	return &Bus{handlers: make(map[string][]Handler)}
}

func (b *Bus) Subscribe(name string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.handlers[name] = append(b.handlers[name], handler)
}

func (b *Bus) Publish(ctx context.Context, event ports.Event) {
	b.mu.RLock()
	handlers := b.handlers[event.Name()]
	b.mu.RUnlock()

	ctx = context.WithoutCancel(ctx)

	for _, handler := range handlers {
		b.running.Go(func() {
			defer func() {
				if recovered := recover(); recovered != nil {
					slog.Error("event handler panicked", "event", event.Name(), "panic", recovered)
				}
			}()

			handler(ctx, event)
		})
	}
}

func (b *Bus) Wait() {
	b.running.Wait()
}
