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

const (
	realtimeChannel = "coaster:realtime"
	replayWindow    = 2 * time.Minute

	busTimeout = 5 * time.Second
)

func replayKey(establishmentID string) string {
	return "realtime:" + establishmentID + ":replay"
}

type busMessage struct {
	Origin          string                `json:"origin"`
	Kind            string                `json:"kind"`
	EstablishmentID string                `json:"establishmentId"`
	Frame           *domain.RealtimeFrame `json:"frame,omitempty"`
	UserID          string                `json:"userId,omitempty"`
}

type RealtimeReceiver interface {
	Deliver(establishmentID string, frame domain.RealtimeFrame)
	CloseStreams(establishmentID string, userID string)
}

type RealtimeBus struct {
	client  *redis.Client
	origin  string
	dropped atomic.Bool
}

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

func (b *RealtimeBus) Close() error {
	if b.client == nil {
		return nil
	}
	return b.client.Close()
}

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

func (b *RealtimeBus) drop(command string, err error) {
	if !b.dropped.CompareAndSwap(false, true) {
		return
	}

	slog.Warn("The shared bus refused "+command+"; events reach only the clients on this instance", "error", err)
}

func isFiniteNumber(value string) bool {
	number, err := strconv.ParseFloat(value, 64)
	return err == nil && !math.IsInf(number, 0) && !math.IsNaN(number)
}

func marshalCompact(v any) (string, error) {
	var buf bytes.Buffer

	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(v); err != nil {
		return "", err
	}

	return string(bytes.TrimSuffix(buf.Bytes(), []byte("\n"))), nil
}
