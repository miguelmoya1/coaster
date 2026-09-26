package event

import (
	"context"
	"log/slog"
	"sync"

	"api-go/internal/core/ports"
)

// Handler reacts to one event. It runs in its own goroutine.
type Handler func(ctx context.Context, event ports.Event)

// Bus is the in-memory EventPublisher. Every subscriber of an event runs in its own
// goroutine, so the request that published it does not wait.
type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
	running  sync.WaitGroup
}

func NewBus() *Bus {
	return &Bus{handlers: make(map[string][]Handler)}
}

// Subscribe registers a handler for the events with this name.
func (b *Bus) Subscribe(name string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.handlers[name] = append(b.handlers[name], handler)
}

// Publish runs every handler of the event in its own goroutine and returns at once.
// The handlers get a context that is not cancelled when the request ends.
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

// Wait blocks until every handler that is running has finished. main calls it on shutdown.
func (b *Bus) Wait() {
	b.running.Wait()
}
