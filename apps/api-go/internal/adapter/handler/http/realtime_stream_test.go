package http

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// recordingWriter keeps what the stream wrote. It can be told to refuse writes, like a
// socket the client closed.
type recordingWriter struct {
	mu      sync.Mutex
	written strings.Builder
	refuse  bool
}

func (w *recordingWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.refuse {
		return 0, errors.New("write after end")
	}
	return w.written.Write(p)
}

func (w *recordingWriter) String() string {
	w.mu.Lock()
	defer w.mu.Unlock()

	return w.written.String()
}

func (w *recordingWriter) refuseWrites() {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.refuse = true
}

func noFlush() error { return nil }

// runStream runs the stream in its own goroutine. The channel closes when run returns.
func runStream(ctx context.Context, stream *realtimeStream, w *recordingWriter, missed func() []domain.RealtimeFrame) chan struct{} {
	finished := make(chan struct{})
	go func() {
		stream.run(ctx, w, noFlush, missed)
		close(finished)
	}()
	return finished
}

func waitFor(t *testing.T, what string, done func() bool) {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for !done() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(time.Millisecond)
	}
}

func waitClosed(t *testing.T, finished chan struct{}) {
	t.Helper()

	select {
	case <-finished:
	case <-time.After(2 * time.Second):
		t.Fatal("the stream is still open")
	}
}

var streamFrame = domain.RealtimeFrame{ID: "1000", Event: domain.RealtimeOrderCreated, Payload: []byte(`{"id":"order-1"}`)}

func TestRealtimeStream(t *testing.T) {
	t.Run("flushes a comment as soon as it starts, so no proxy holds the headers back", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		finished := runStream(context.Background(), stream, w, nil)

		waitFor(t, "the opening comment", func() bool { return w.String() == ": open\n\n" })
		stream.Close()
		waitClosed(t, finished)
	})

	t.Run("writes an event as an SSE frame", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		finished := runStream(context.Background(), stream, w, nil)

		stream.Deliver(streamFrame)

		want := ": open\n\nid: 1000\nevent: orderCreated\ndata: {\"id\":\"order-1\"}\n\n"
		waitFor(t, "the frame", func() bool { return w.String() == want })
		stream.Close()
		waitClosed(t, finished)
	})

	t.Run("writes the missed frames after the opening comment", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		missed := func() []domain.RealtimeFrame { return []domain.RealtimeFrame{streamFrame} }
		finished := runStream(context.Background(), stream, w, missed)

		want := ": open\n\nid: 1000\nevent: orderCreated\ndata: {\"id\":\"order-1\"}\n\n"
		waitFor(t, "the missed frame", func() bool { return w.String() == want })
		stream.Close()
		waitClosed(t, finished)
	})

	t.Run("beats while it is open", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		stream.heartbeat = 5 * time.Millisecond
		finished := runStream(context.Background(), stream, w, nil)

		waitFor(t, "a heartbeat", func() bool { return strings.Contains(w.String(), ": ping\n\n") })
		stream.Close()
		waitClosed(t, finished)
	})

	t.Run("closes itself after its lifetime, so the client comes back with a fresh token", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		stream.lifetime = 10 * time.Millisecond
		finished := runStream(context.Background(), stream, w, nil)

		waitClosed(t, finished)
	})

	t.Run("stops writing once it is closed", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		stream.heartbeat = 5 * time.Millisecond
		finished := runStream(context.Background(), stream, w, nil)

		stream.Close()
		waitClosed(t, finished)
		written := w.String()
		stream.Deliver(streamFrame)
		time.Sleep(20 * time.Millisecond)

		if w.String() != written {
			t.Fatalf("wrote %q after closing", strings.TrimPrefix(w.String(), written))
		}
	})

	t.Run("can be closed more than once", func(t *testing.T) {
		stream := newRealtimeStream("user-1")

		stream.Close()
		stream.Close()
	})

	t.Run("closes when the client hangs up", func(t *testing.T) {
		ctx, hangUp := context.WithCancel(context.Background())
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		finished := runStream(ctx, stream, w, nil)

		hangUp()
		waitClosed(t, finished)
	})

	t.Run("closes instead of failing when the socket refuses a write", func(t *testing.T) {
		stream, w := newRealtimeStream("user-1"), &recordingWriter{}
		finished := runStream(context.Background(), stream, w, nil)
		waitFor(t, "the opening comment", func() bool { return w.String() != "" })

		w.refuseWrites()
		stream.Deliver(streamFrame)

		waitClosed(t, finished)
	})

	t.Run("closes when the client is too slow to keep up", func(t *testing.T) {
		stream := newRealtimeStream("user-1")

		for range streamBuffer + 1 {
			stream.Deliver(streamFrame)
		}

		select {
		case <-stream.done:
		default:
			t.Fatal("the stream is still open")
		}
	})
}
