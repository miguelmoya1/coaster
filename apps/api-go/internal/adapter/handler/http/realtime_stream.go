package http

import (
	"context"
	"io"
	"sync"
	"time"

	"api-go/internal/core/domain"
)

const (
	// heartbeatInterval keeps proxies from closing a quiet stream.
	heartbeatInterval = 25 * time.Second
	// maxStreamLifetime makes the browser come back with a fresh token.
	maxStreamLifetime = 30 * time.Minute
	// streamBuffer is how many frames can wait for a slow client before its stream closes.
	streamBuffer = 64
)

// realtimeStream is one open SSE connection (RealtimeStream in Nest). It implements
// ports.RealtimeSubscriber: Deliver and Close can be called from any goroutine, and only
// run, in the handler's goroutine, writes to the connection.
type realtimeStream struct {
	userID    string
	frames    chan domain.RealtimeFrame
	done      chan struct{}
	closeOnce sync.Once
	heartbeat time.Duration
	lifetime  time.Duration
}

func newRealtimeStream(userID string) *realtimeStream {
	return &realtimeStream{
		userID:    userID,
		frames:    make(chan domain.RealtimeFrame, streamBuffer),
		done:      make(chan struct{}),
		heartbeat: heartbeatInterval,
		lifetime:  maxStreamLifetime,
	}
}

func (s *realtimeStream) UserID() string {
	return s.userID
}

// Deliver queues the frame. When the client is so slow that the queue is full, the stream
// closes: the browser reconnects and asks for what it missed with Last-Event-ID.
func (s *realtimeStream) Deliver(frame domain.RealtimeFrame) {
	select {
	case <-s.done:
	case s.frames <- frame:
	default:
		s.Close()
	}
}

// Close ends the stream. Calling it again does nothing.
func (s *realtimeStream) Close() {
	s.closeOnce.Do(func() { close(s.done) })
}

// run writes the stream until it is closed, the client hangs up (ctx ends), a write fails
// or it has been open for its whole lifetime. It first writes a comment, so no proxy holds
// the headers back, and then the frames missed returns, if any.
func (s *realtimeStream) run(ctx context.Context, w io.Writer, flush func() error, missed func() []domain.RealtimeFrame) {
	defer s.Close()

	if !s.write(w, flush, ": open\n\n") {
		return
	}

	if missed != nil {
		for _, frame := range missed() {
			if !s.write(w, flush, frameText(frame)) {
				return
			}
		}
	}

	heartbeat := time.NewTicker(s.heartbeat)
	defer heartbeat.Stop()
	lifetime := time.NewTimer(s.lifetime)
	defer lifetime.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.done:
			return
		case <-lifetime.C:
			return
		case <-heartbeat.C:
			if !s.write(w, flush, ": ping\n\n") {
				return
			}
		case frame := <-s.frames:
			if !s.write(w, flush, frameText(frame)) {
				return
			}
		}
	}
}

// write sends text to the client at once and reports whether it could.
func (s *realtimeStream) write(w io.Writer, flush func() error, text string) bool {
	if _, err := io.WriteString(w, text); err != nil {
		return false
	}
	return flush() == nil
}

// frameText is the SSE frame of a frame, as Nest writes it.
func frameText(frame domain.RealtimeFrame) string {
	return "id: " + frame.ID + "\nevent: " + frame.Event + "\ndata: " + string(frame.Payload) + "\n\n"
}
