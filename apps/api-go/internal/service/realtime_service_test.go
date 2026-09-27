package service

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// fakeSubscriber records what reached one stream.
type fakeSubscriber struct {
	userID    string
	delivered []domain.RealtimeFrame
	closed    int
	onDeliver func()
}

func (f *fakeSubscriber) UserID() string { return f.userID }

func (f *fakeSubscriber) Deliver(frame domain.RealtimeFrame) {
	f.delivered = append(f.delivered, frame)
	if f.onDeliver != nil {
		f.onDeliver()
	}
}

func (f *fakeSubscriber) Close() { f.closed++ }

// fakeRealtimeBus records what the service sent to the other instances.
type fakeRealtimeBus struct {
	events      []domain.RealtimeFrame
	revoked     []string
	remembered  []domain.RealtimeFrame
	replayed    []domain.RealtimeFrame
	replayAsked string
}

func (b *fakeRealtimeBus) PublishEvent(_ string, frame domain.RealtimeFrame) {
	b.events = append(b.events, frame)
}

func (b *fakeRealtimeBus) PublishRevoke(establishmentID string, userID string) {
	b.revoked = append(b.revoked, establishmentID+"/"+userID)
}

func (b *fakeRealtimeBus) Remember(_ string, frame domain.RealtimeFrame) {
	b.remembered = append(b.remembered, frame)
}

func (b *fakeRealtimeBus) Replay(_ context.Context, establishmentID string, sinceID string) []domain.RealtimeFrame {
	b.replayAsked = establishmentID + "/" + sinceID
	return b.replayed
}

var testFrame = domain.RealtimeFrame{ID: "1000", Event: domain.RealtimeOrderCreated, Payload: []byte(`{"id":"order-1"}`)}

func TestRealtimeServiceRegistry(t *testing.T) {
	t.Run("delivers to every subscriber of the establishment", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		first := &fakeSubscriber{userID: "user-1"}
		second := &fakeSubscriber{userID: "user-2"}

		realtime.Watch("establishment-1", first)
		realtime.Watch("establishment-1", second)
		realtime.Deliver("establishment-1", testFrame)

		if len(first.delivered) != 1 || len(second.delivered) != 1 {
			t.Fatalf("delivered %d and %d frames, want 1 and 1", len(first.delivered), len(second.delivered))
		}
	})

	t.Run("leaves the subscribers of another establishment alone", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		outsider := &fakeSubscriber{userID: "user-1"}

		realtime.Watch("establishment-2", outsider)
		realtime.Deliver("establishment-1", testFrame)

		if len(outsider.delivered) != 0 {
			t.Fatalf("the outsider got %v", outsider.delivered)
		}
	})

	t.Run("stops delivering once the subscriber is removed", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		subscriber := &fakeSubscriber{userID: "user-1"}

		remove := realtime.Watch("establishment-1", subscriber)
		remove()
		realtime.Deliver("establishment-1", testFrame)

		if len(subscriber.delivered) != 0 || realtime.CountFor("establishment-1") != 0 {
			t.Fatalf("delivered %d, count %d", len(subscriber.delivered), realtime.CountFor("establishment-1"))
		}
	})

	t.Run("closes only the streams of the revoked user", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		revoked := &fakeSubscriber{userID: "user-1"}
		workmate := &fakeSubscriber{userID: "user-2"}

		realtime.Watch("establishment-1", revoked)
		realtime.Watch("establishment-1", workmate)
		realtime.CloseStreams("establishment-1", "user-1")

		if revoked.closed != 1 || workmate.closed != 0 {
			t.Fatalf("closed revoked %d, workmate %d", revoked.closed, workmate.closed)
		}
	})

	t.Run("closes every stream the revoked user has open", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		tablet := &fakeSubscriber{userID: "user-1"}
		till := &fakeSubscriber{userID: "user-1"}

		realtime.Watch("establishment-1", tablet)
		realtime.Watch("establishment-1", till)
		realtime.CloseStreams("establishment-1", "user-1")

		if tablet.closed != 1 || till.closed != 1 {
			t.Fatalf("closed tablet %d, till %d", tablet.closed, till.closed)
		}
	})

	t.Run("survives a subscriber that removes itself while being delivered to", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		subscriber := &fakeSubscriber{userID: "user-1"}

		remove := realtime.Watch("establishment-1", subscriber)
		subscriber.onDeliver = remove
		realtime.Deliver("establishment-1", testFrame)

		if realtime.CountFor("establishment-1") != 0 {
			t.Fatalf("count = %d, want 0", realtime.CountFor("establishment-1"))
		}
	})

	t.Run("closes every stream on shutdown", func(t *testing.T) {
		realtime := NewRealtimeService(&fakeRealtimeBus{})
		here := &fakeSubscriber{userID: "user-1"}
		there := &fakeSubscriber{userID: "user-2"}

		realtime.Watch("establishment-1", here)
		realtime.Watch("establishment-2", there)
		realtime.CloseAll()

		if here.closed != 1 || there.closed != 1 {
			t.Fatalf("closed %d and %d, want 1 and 1", here.closed, there.closed)
		}
	})
}

func TestRealtimeServicePublish(t *testing.T) {
	bus := &fakeRealtimeBus{}
	realtime := NewRealtimeService(bus)
	realtime.now = func() time.Time { return time.UnixMilli(1790000000123) }
	subscriber := &fakeSubscriber{userID: "user-1"}
	realtime.Watch("establishment-1", subscriber)

	realtime.Publish("establishment-1", domain.RealtimeOrderCreated, map[string]string{"id": "order-1", "note": "<b>&</b>"})

	want := domain.RealtimeFrame{
		ID:      "1790000000123",
		Event:   "orderCreated",
		Payload: []byte(`{"id":"order-1","note":"<b>&</b>"}`),
	}
	if len(subscriber.delivered) != 1 || !sameFrame(subscriber.delivered[0], want) {
		t.Fatalf("delivered %+v, want %+v", subscriber.delivered, want)
	}
	if len(bus.events) != 1 || !sameFrame(bus.events[0], want) {
		t.Fatalf("published to the bus %+v", bus.events)
	}
	if len(bus.remembered) != 1 || !sameFrame(bus.remembered[0], want) {
		t.Fatalf("remembered %+v", bus.remembered)
	}
}

func TestRealtimeServiceRevoke(t *testing.T) {
	bus := &fakeRealtimeBus{}
	realtime := NewRealtimeService(bus)
	subscriber := &fakeSubscriber{userID: "user-1"}
	realtime.Watch("establishment-1", subscriber)

	realtime.Revoke("establishment-1", "user-1")

	if subscriber.closed != 1 {
		t.Fatalf("closed %d times, want 1", subscriber.closed)
	}
	if len(bus.revoked) != 1 || bus.revoked[0] != "establishment-1/user-1" {
		t.Fatalf("revoked on the bus %v", bus.revoked)
	}
}

func TestRealtimeServiceReplay(t *testing.T) {
	bus := &fakeRealtimeBus{replayed: []domain.RealtimeFrame{testFrame}}
	realtime := NewRealtimeService(bus)

	frames := realtime.Replay(context.Background(), "establishment-1", "1000")

	if len(frames) != 1 || bus.replayAsked != "establishment-1/1000" {
		t.Fatalf("replayed %v, asked %q", frames, bus.replayAsked)
	}
}

func sameFrame(a, b domain.RealtimeFrame) bool {
	return a.ID == b.ID && a.Event == b.Event && string(a.Payload) == string(b.Payload)
}
