package httpapi

import (
	"context"
	"io"
	"sync"
	"time"

	"coaster-api/internal/core/domain"
)

const (
	heartbeatInterval = 25 * time.Second

	maxStreamLifetime = 30 * time.Minute

	streamBuffer = 64
)

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

func (s *realtimeStream) Deliver(frame domain.RealtimeFrame) {
	select {
	case <-s.done:
	case s.frames <- frame:
	default:
		s.Close()
	}
}

func (s *realtimeStream) Close() {
	s.closeOnce.Do(func() { close(s.done) })
}

func (s *realtimeStream) run(ctx context.Context, w io.Writer, flush func() error, missed func() []domain.RealtimeFrame) {
	defer s.Close()

	if !s.write(w, flush, ": open\n\n") || !s.replay(w, flush, missed) {
		return
	}
	s.relay(ctx, w, flush)
}

func (s *realtimeStream) replay(w io.Writer, flush func() error, missed func() []domain.RealtimeFrame) bool {
	if missed == nil {
		return true
	}

	for _, frame := range missed() {
		if !s.write(w, flush, frameText(frame)) {
			return false
		}
	}
	return true
}

func (s *realtimeStream) relay(ctx context.Context, w io.Writer, flush func() error) {
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

func (s *realtimeStream) write(w io.Writer, flush func() error, text string) bool {
	if _, err := io.WriteString(w, text); err != nil {
		return false
	}
	return flush() == nil
}

func frameText(frame domain.RealtimeFrame) string {
	return "id: " + frame.ID + "\nevent: " + frame.Event + "\ndata: " + string(frame.Payload) + "\n\n"
}
