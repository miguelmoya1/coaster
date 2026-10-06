package event

import (
	"context"
	"sync/atomic"
	"testing"

	"coaster-api/internal/core/ports"
)

type orderCreated struct{ id string }

type orderDeleted struct{}

var _ ports.EventPublisher = (*Bus)(nil)

func TestPublishRunsEverySubscriberOfTheEvent(t *testing.T) {
	bus := NewBus()

	var created, deleted atomic.Int32
	var id atomic.Value
	bus.Subscribe(
		ports.On(func(ctx context.Context, event orderCreated) { created.Add(1) }),
		ports.On(func(ctx context.Context, event orderCreated) { id.Store(event.id) }),
		ports.On(func(ctx context.Context, event orderDeleted) { deleted.Add(1) }),
	)

	bus.Publish(context.Background(), orderCreated{id: "o1"})
	bus.Wait()

	if created.Load() != 1 || id.Load() != "o1" {
		t.Errorf("orderCreated handlers saw %d events and id %v, want 1 and o1", created.Load(), id.Load())
	}
	if deleted.Load() != 0 {
		t.Errorf("orderDeleted handlers ran %d times, want 0", deleted.Load())
	}
}

func TestPublishDoesNotPassACancelledContext(t *testing.T) {
	bus := NewBus()

	var cancelled atomic.Bool
	bus.Subscribe(ports.On(func(ctx context.Context, event orderCreated) {
		cancelled.Store(ctx.Err() != nil)
	}))

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	bus.Publish(ctx, orderCreated{})
	bus.Wait()

	if cancelled.Load() {
		t.Error("the handler got a cancelled context")
	}
}

func TestAPanickingHandlerDoesNotStopTheOthers(t *testing.T) {
	bus := NewBus()

	var ran atomic.Bool
	bus.Subscribe(
		ports.On(func(ctx context.Context, event orderCreated) { panic("boom") }),
		ports.On(func(ctx context.Context, event orderCreated) { ran.Store(true) }),
	)

	bus.Publish(context.Background(), orderCreated{})
	bus.Wait()

	if !ran.Load() {
		t.Error("the second handler did not run")
	}
}
