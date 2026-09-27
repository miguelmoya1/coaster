package cache

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

var busFrame = domain.RealtimeFrame{ID: "1000", Event: domain.RealtimeOrderCreated, Payload: []byte(`{"id":"order-1"}`)}

// fakeReceiver passes what the bus hands it to the test through channels.
type fakeReceiver struct {
	frames  chan string
	revoked chan string
}

func newFakeReceiver() *fakeReceiver {
	return &fakeReceiver{frames: make(chan string, 10), revoked: make(chan string, 10)}
}

func (r *fakeReceiver) Deliver(establishmentID string, frame domain.RealtimeFrame) {
	r.frames <- establishmentID + " " + frame.ID + " " + frame.Event + " " + string(frame.Payload)
}

func (r *fakeReceiver) CloseStreams(establishmentID string, userID string) {
	r.revoked <- establishmentID + " " + userID
}

// listen starts bus.Listen and waits until Redis has one more subscriber on the channel.
func listen(t *testing.T, bus *RealtimeBus, receiver RealtimeReceiver) {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())
	before := subscribers(t)
	done := make(chan struct{})
	go func() {
		bus.Listen(ctx, receiver)
		close(done)
	}()
	t.Cleanup(func() {
		cancel()
		<-done
	})

	deadline := time.Now().Add(5 * time.Second)
	for subscribers(t) <= before {
		if time.Now().After(deadline) {
			t.Fatal("the bus never subscribed")
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func subscribers(t *testing.T) int64 {
	t.Helper()

	counts, err := testClient.PubSubNumSub(context.Background(), realtimeChannel).Result()
	if err != nil {
		t.Fatalf("counting subscribers: %v", err)
	}
	return counts[realtimeChannel]
}

func expect(t *testing.T, got chan string, want string) {
	t.Helper()

	select {
	case message := <-got:
		if message != want {
			t.Fatalf("got %q, want %q", message, want)
		}
	case <-time.After(5 * time.Second):
		t.Fatalf("nothing arrived, want %q", want)
	}
}

func expectNothing(t *testing.T, got chan string) {
	t.Helper()

	select {
	case message := <-got:
		t.Fatalf("got %q, want nothing", message)
	case <-time.After(200 * time.Millisecond):
	}
}

func TestRealtimeBusSharesAcrossInstances(t *testing.T) {
	resetRedis(t)
	sender, other := newRealtimeBus(testClient), newRealtimeBus(testClient)
	senderReceiver, otherReceiver := newFakeReceiver(), newFakeReceiver()
	listen(t, sender, senderReceiver)
	listen(t, other, otherReceiver)

	sender.PublishEvent("establishment-1", busFrame)
	expect(t, otherReceiver.frames, `establishment-1 1000 orderCreated {"id":"order-1"}`)

	sender.PublishRevoke("establishment-1", "user-1")
	expect(t, otherReceiver.revoked, "establishment-1 user-1")

	// What an instance published itself already reached its own streams.
	expectNothing(t, senderReceiver.frames)
	expectNothing(t, senderReceiver.revoked)
}

func TestRealtimeBusReadsNestMessages(t *testing.T) {
	resetRedis(t)
	bus := newRealtimeBus(testClient)
	receiver := newFakeReceiver()
	listen(t, bus, receiver)
	ctx := context.Background()

	messages := []string{
		`not json`,
		`{"origin":"nest-instance","kind":"event","establishmentId":"establishment-1","frame":{"id":"1200","event":"orderUpdated","payload":{"id":"order-2","note":"<b>"}}}`,
		`{"origin":"nest-instance","kind":"revoke","establishmentId":"establishment-1","userId":"user-1"}`,
	}
	for _, message := range messages {
		if err := testClient.Publish(ctx, realtimeChannel, message).Err(); err != nil {
			t.Fatalf("publishing: %v", err)
		}
	}

	expect(t, receiver.frames, `establishment-1 1200 orderUpdated {"id":"order-2","note":"<b>"}`)
	expect(t, receiver.revoked, "establishment-1 user-1")
}

func TestRealtimeBusWritesNestMessages(t *testing.T) {
	resetRedis(t)
	bus := newRealtimeBus(testClient)
	ctx := context.Background()

	pubsub := testClient.Subscribe(ctx, realtimeChannel)
	defer pubsub.Close()
	if _, err := pubsub.Receive(ctx); err != nil {
		t.Fatalf("subscribing: %v", err)
	}

	bus.PublishEvent("establishment-1", domain.RealtimeFrame{ID: "1000", Event: "orderCreated", Payload: []byte(`{"note":"<b>"}`)})
	bus.PublishRevoke("establishment-1", "user-1")

	want := []string{
		`{"origin":"` + bus.origin + `","kind":"event","establishmentId":"establishment-1","frame":{"id":"1000","event":"orderCreated","payload":{"note":"<b>"}}}`,
		`{"origin":"` + bus.origin + `","kind":"revoke","establishmentId":"establishment-1","userId":"user-1"}`,
	}
	for _, message := range want {
		received, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			t.Fatalf("receiving: %v", err)
		}
		if received.Payload != message {
			t.Fatalf("published %s, want %s", received.Payload, message)
		}
	}
}

func TestRealtimeBusReplay(t *testing.T) {
	resetRedis(t)
	bus := newRealtimeBus(testClient)
	ctx := context.Background()
	key := "realtime:establishment-1:replay"

	old := domain.RealtimeFrame{ID: "1000", Event: "orderCreated", Payload: []byte(`{"id":"order-0"}`)}
	first := domain.RealtimeFrame{ID: "200000", Event: "orderCreated", Payload: []byte(`{"id":"order-1"}`)}
	second := domain.RealtimeFrame{ID: "200200", Event: "orderUpdated", Payload: []byte(`{"id":"order-2"}`)}
	bus.Remember("establishment-1", old)
	bus.Remember("establishment-1", first)
	bus.Remember("establishment-1", second)

	stored, err := testClient.ZRangeWithScores(ctx, key, 0, -1).Result()
	if err != nil {
		t.Fatalf("reading the buffer: %v", err)
	}
	if len(stored) != 2 || stored[0].Score != 200000 || stored[0].Member != `{"id":"200000","event":"orderCreated","payload":{"id":"order-1"}}` {
		t.Fatalf("the buffer holds %v; the frame older than two minutes should be gone", stored)
	}
	if ttl := testClient.PTTL(ctx, key).Val(); ttl <= 0 || ttl > replayWindow {
		t.Fatalf("the buffer expires in %v", ttl)
	}

	tests := []struct {
		name    string
		sinceID string
		want    []string
	}{
		{"hands back what the client missed, its own last event included", "200000", []string{"200000", "200200"}},
		{"hands back only what came later", "200001", []string{"200200"}},
		{"replays nothing for an id that is not a number", "nonsense", nil},
		{"replays nothing for an infinite id", "Infinity", nil},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			frames := bus.Replay(ctx, "establishment-1", test.sinceID)

			var ids []string
			for _, frame := range frames {
				ids = append(ids, frame.ID)
			}
			if len(ids) != len(test.want) {
				t.Fatalf("replayed %v, want %v", ids, test.want)
			}
			for i := range ids {
				if ids[i] != test.want[i] {
					t.Fatalf("replayed %v, want %v", ids, test.want)
				}
			}
		})
	}

	if frames := bus.Replay(ctx, "establishment-1", "200200"); string(frames[0].Payload) != `{"id":"order-2"}` {
		t.Fatalf("replayed payload %s", frames[0].Payload)
	}
}

func TestRealtimeBusWithoutRedis(t *testing.T) {
	bus := NewRealtimeBus("")

	bus.PublishEvent("establishment-1", busFrame)
	bus.PublishRevoke("establishment-1", "user-1")
	bus.Remember("establishment-1", busFrame)
	bus.Listen(context.Background(), newFakeReceiver())

	if frames := bus.Replay(context.Background(), "establishment-1", "1000"); frames != nil {
		t.Fatalf("replayed %v without Redis", frames)
	}
	if err := bus.Close(); err != nil {
		t.Fatalf("closing: %v", err)
	}
}

func TestRealtimeBusSurvivesARefusingRedis(t *testing.T) {
	// Nothing listens on port 1, so every command fails.
	bus := NewRealtimeBus("redis://127.0.0.1:1")
	defer bus.Close()

	bus.PublishEvent("establishment-1", busFrame)
	bus.Remember("establishment-1", busFrame)

	if frames := bus.Replay(context.Background(), "establishment-1", "1000"); frames != nil {
		t.Fatalf("replayed %v from a Redis that refuses", frames)
	}
}
