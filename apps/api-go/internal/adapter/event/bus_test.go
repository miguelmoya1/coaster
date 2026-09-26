package event

import (
	"context"
	"sync/atomic"
	"testing"

	"api-go/internal/core/ports"
)

type testEvent struct{ name string }

func (e testEvent) Name() string { return e.name }

var _ ports.EventPublisher = (*Bus)(nil)

func TestPublishRunsEverySubscriberOfTheEvent(t *testing.T) {
	bus := NewBus()

	var created, deleted atomic.Int32
	bus.Subscribe("order.created", func(ctx context.Context, event ports.Event) { created.Add(1) })
	bus.Subscribe("order.created", func(ctx context.Context, event ports.Event) { created.Add(1) })
	bus.Subscribe("order.deleted", func(ctx context.Context, event ports.Event) { deleted.Add(1) })

	bus.Publish(context.Background(), testEvent{name: "order.created"})
	bus.Wait()

	if created.Load() != 2 {
		t.Errorf("order.created handlers ran %d times, want 2", created.Load())
	}
	if deleted.Load() != 0 {
		t.Errorf("order.deleted handlers ran %d times, want 0", deleted.Load())
	}
}

func TestPublishDoesNotPassACancelledContext(t *testing.T) {
	bus := NewBus()

	var cancelled atomic.Bool
	bus.Subscribe("order.created", func(ctx context.Context, event ports.Event) {
		cancelled.Store(ctx.Err() != nil)
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	bus.Publish(ctx, testEvent{name: "order.created"})
	bus.Wait()

	if cancelled.Load() {
		t.Error("the handler got a cancelled context")
	}
}

func TestAPanickingHandlerDoesNotStopTheOthers(t *testing.T) {
	bus := NewBus()

	var ran atomic.Bool
	bus.Subscribe("order.created", func(ctx context.Context, event ports.Event) { panic("boom") })
	bus.Subscribe("order.created", func(ctx context.Context, event ports.Event) { ran.Store(true) })

	bus.Publish(context.Background(), testEvent{name: "order.created"})
	bus.Wait()

	if !ran.Load() {
		t.Error("the second handler did not run")
	}
}
