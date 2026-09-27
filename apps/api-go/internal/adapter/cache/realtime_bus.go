package cache

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"strconv"
	"sync/atomic"
	"time"
	"uuid"

	"github.com/redis/go-redis/v9"

	"api-go/internal/core/domain"
)

// The channel and keys Nest uses, so both APIs can share one Redis during the beta.
const (
	realtimeChannel = "coaster:realtime"
	replayWindow    = 2 * time.Minute
	// busTimeout bounds each Redis command, so a stuck Redis never holds a publisher.
	busTimeout = 5 * time.Second
)

func replayKey(establishmentID string) string {
	return "realtime:" + establishmentID + ":replay"
}

// busMessage is what travels on the channel: a frame (kind "event") or a revocation
// (kind "revoke"). The JSON is the same as Nest's BusMessage.
type busMessage struct {
	Origin          string                `json:"origin"`
	Kind            string                `json:"kind"`
	EstablishmentID string                `json:"establishmentId"`
	Frame           *domain.RealtimeFrame `json:"frame,omitempty"`
	UserID          string                `json:"userId,omitempty"`
}

// RealtimeReceiver is what the bus hands the messages of the other instances to
// (service.RealtimeService).
type RealtimeReceiver interface {
	Deliver(establishmentID string, frame domain.RealtimeFrame)
	CloseStreams(establishmentID string, userID string)
}

// RealtimeBus is ports.RealtimeBus on Redis: pub/sub on coaster:realtime between the
// instances and a sorted set per establishment for replay. Without a client it does
// nothing. A Redis error is logged once and the bus carries on, like Nest.
type RealtimeBus struct {
	client  *redis.Client
	origin  string
	dropped atomic.Bool
}

// NewRealtimeBus connects to REDIS_URL with a client of its own, because the
// subscription keeps a connection busy. Without a URL it works in this process only.
func NewRealtimeBus(url string) *RealtimeBus {
	if url == "" {
		return newRealtimeBus(nil)
	}

	options, err := redis.ParseURL(url)
	if err != nil {
		slog.Error("REDIS_URL is not a usable address; events reach only this instance", "error", err)
		return newRealtimeBus(nil)
	}

	options.ClientName = "coaster-realtime"
	options.MaxRetries = 1

	return newRealtimeBus(redis.NewClient(options))
}

func newRealtimeBus(client *redis.Client) *RealtimeBus {
	return &RealtimeBus{client: client, origin: uuid.NewV4().String()}
}

// Close closes the Redis client, if there is one.
func (b *RealtimeBus) Close() error {
	if b.client == nil {
		return nil
	}
	return b.client.Close()
}

// Listen hands receiver what the other instances publish until ctx ends. It skips what
// this instance published itself, which its own streams already got.
func (b *RealtimeBus) Listen(ctx context.Context, receiver RealtimeReceiver) {
	if b.client == nil {
		slog.Warn("Events reach only the clients on this instance: there is no shared bus")
		return
	}

	pubsub := b.client.Subscribe(ctx, realtimeChannel)
	defer pubsub.Close()

	if _, err := pubsub.Receive(ctx); err != nil {
		b.drop("subscribe", err)
		return
	}
	slog.Info("Events are shared across instances")

	messages := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case message, ok := <-messages:
			if !ok {
				return
			}
			b.receive(message.Payload, receiver)
		}
	}
}

func (b *RealtimeBus) PublishEvent(establishmentID string, frame domain.RealtimeFrame) {
	b.send(busMessage{Origin: b.origin, Kind: "event", EstablishmentID: establishmentID, Frame: &frame})
}

func (b *RealtimeBus) PublishRevoke(establishmentID string, userID string) {
	b.send(busMessage{Origin: b.origin, Kind: "revoke", EstablishmentID: establishmentID, UserID: userID})
}

// Remember keeps the frame for two minutes, scored by its id.
func (b *RealtimeBus) Remember(establishmentID string, frame domain.RealtimeFrame) {
	if b.client == nil {
		return
	}

	score, err := strconv.ParseInt(frame.ID, 10, 64)
	if err != nil {
		slog.Error("a realtime frame id is not a number", "id", frame.ID)
		return
	}

	member, err := marshalCompact(frame)
	if err != nil {
		slog.Error("encoding a realtime frame", "error", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), busTimeout)
	defer cancel()

	key := replayKey(establishmentID)
	_, err = b.client.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(score), Member: member})
		pipe.ZRemRangeByScore(ctx, key, "-inf", strconv.FormatInt(score-replayWindow.Milliseconds(), 10))
		pipe.PExpire(ctx, key, replayWindow)
		return nil
	})
	if err != nil {
		b.drop("the replay buffer", err)
	}
}

// Replay returns the frames kept for the establishment from sinceID on, sinceID included.
// An id that is not a number replays nothing.
func (b *RealtimeBus) Replay(ctx context.Context, establishmentID string, sinceID string) []domain.RealtimeFrame {
	if b.client == nil || !isFiniteNumber(sinceID) {
		return nil
	}

	stored, err := b.client.ZRangeByScore(ctx, replayKey(establishmentID), &redis.ZRangeBy{Min: sinceID, Max: "+inf"}).Result()
	if err != nil {
		b.drop("the replay buffer", err)
		return nil
	}

	frames := make([]domain.RealtimeFrame, 0, len(stored))
	for _, raw := range stored {
		var frame domain.RealtimeFrame
		if err := json.Unmarshal([]byte(raw), &frame); err != nil {
			slog.Warn("Discarding an unreadable frame in the replay buffer", "error", err)
			continue
		}
		frames = append(frames, frame)
	}
	return frames
}

func (b *RealtimeBus) send(message busMessage) {
	if b.client == nil {
		return
	}

	raw, err := marshalCompact(message)
	if err != nil {
		slog.Error("encoding a realtime message", "error", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), busTimeout)
	defer cancel()

	if err := b.client.Publish(ctx, realtimeChannel, raw).Err(); err != nil {
		b.drop("publish", err)
	}
}

func (b *RealtimeBus) receive(raw string, receiver RealtimeReceiver) {
	var message busMessage
	if err := json.Unmarshal([]byte(raw), &message); err != nil {
		slog.Warn("Discarding an unreadable message on "+realtimeChannel, "error", err)
		return
	}

	if message.Origin == b.origin {
		return
	}

	switch message.Kind {
	case "revoke":
		receiver.CloseStreams(message.EstablishmentID, message.UserID)
	case "event":
		if message.Frame != nil {
			receiver.Deliver(message.EstablishmentID, *message.Frame)
		}
	}
}

// drop logs the first Redis error only, as Nest does, so a Redis outage does not flood
// the log.
func (b *RealtimeBus) drop(command string, err error) {
	if !b.dropped.CompareAndSwap(false, true) {
		return
	}

	slog.Warn("The shared bus refused "+command+"; events reach only the clients on this instance", "error", err)
}

// isFiniteNumber is Number.isFinite(Number(value)) for the ids a browser sends back.
func isFiniteNumber(value string) bool {
	number, err := strconv.ParseFloat(value, 64)
	return err == nil && !math.IsInf(number, 0) && !math.IsNaN(number)
}

// marshalCompact writes v like JSON.stringify: without escaping <, > and &.
func marshalCompact(v any) (string, error) {
	var buf bytes.Buffer

	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(v); err != nil {
		return "", err
	}

	return string(bytes.TrimSuffix(buf.Bytes(), []byte("\n"))), nil
}
