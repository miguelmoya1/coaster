package service

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type RealtimeService struct {
	bus ports.RealtimeBus
	now func() time.Time

	mu              sync.Mutex
	byEstablishment map[string]map[ports.RealtimeSubscriber]struct{}
}

func NewRealtimeService(bus ports.RealtimeBus) *RealtimeService {
	return &RealtimeService{
		bus:             bus,
		now:             time.Now,
		byEstablishment: make(map[string]map[ports.RealtimeSubscriber]struct{}),
	}
}

func (s *RealtimeService) Publish(establishmentID string, event string, payload any) {
	data, err := marshalPayload(payload)
	if err != nil {
		slog.Error("encoding a realtime payload", "event", event, "error", err)
		return
	}

	frame := domain.RealtimeFrame{
		ID:      strconv.FormatInt(s.now().UnixMilli(), 10),
		Event:   event,
		Payload: data,
	}

	s.Deliver(establishmentID, frame)
	s.bus.PublishEvent(establishmentID, frame)
	s.bus.Remember(establishmentID, frame)
}

func (s *RealtimeService) Revoke(establishmentID string, userID string) {
	s.CloseStreams(establishmentID, userID)
	s.bus.PublishRevoke(establishmentID, userID)
}

func (s *RealtimeService) Watch(establishmentID string, subscriber ports.RealtimeSubscriber) func() {
	s.mu.Lock()
	defer s.mu.Unlock()

	subscribers, ok := s.byEstablishment[establishmentID]
	if !ok {
		subscribers = make(map[ports.RealtimeSubscriber]struct{})
		s.byEstablishment[establishmentID] = subscribers
	}
	subscribers[subscriber] = struct{}{}

	return func() { s.remove(establishmentID, subscriber) }
}

func (s *RealtimeService) Replay(ctx context.Context, establishmentID string, lastEventID string) []domain.RealtimeFrame {
	return s.bus.Replay(ctx, establishmentID, lastEventID)
}

func (s *RealtimeService) Deliver(establishmentID string, frame domain.RealtimeFrame) {
	for _, subscriber := range s.snapshot(establishmentID) {
		subscriber.Deliver(frame)
	}
}

func (s *RealtimeService) CloseStreams(establishmentID string, userID string) {
	for _, subscriber := range s.snapshot(establishmentID) {
		if subscriber.UserID() == userID {
			subscriber.Close()
		}
	}
}

func (s *RealtimeService) CloseAll() {
	s.mu.Lock()
	var all []ports.RealtimeSubscriber
	for _, subscribers := range s.byEstablishment {
		for subscriber := range subscribers {
			all = append(all, subscriber)
		}
	}
	s.mu.Unlock()

	for _, subscriber := range all {
		subscriber.Close()
	}
}

func (s *RealtimeService) CountFor(establishmentID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	return len(s.byEstablishment[establishmentID])
}

func (s *RealtimeService) snapshot(establishmentID string) []ports.RealtimeSubscriber {
	s.mu.Lock()
	defer s.mu.Unlock()

	subscribers := make([]ports.RealtimeSubscriber, 0, len(s.byEstablishment[establishmentID]))
	for subscriber := range s.byEstablishment[establishmentID] {
		subscribers = append(subscribers, subscriber)
	}
	return subscribers
}

func (s *RealtimeService) remove(establishmentID string, subscriber ports.RealtimeSubscriber) {
	s.mu.Lock()
	defer s.mu.Unlock()

	subscribers, ok := s.byEstablishment[establishmentID]
	if !ok {
		return
	}

	delete(subscribers, subscriber)
	if len(subscribers) == 0 {
		delete(s.byEstablishment, establishmentID)
	}
}

func marshalPayload(payload any) (json.RawMessage, error) {
	var buf bytes.Buffer

	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(payload); err != nil {
		return nil, err
	}

	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}
