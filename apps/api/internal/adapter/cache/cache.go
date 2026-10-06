package cache

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const TTL = 8 * time.Hour

type envelope struct {
	V json.RawMessage `json:"v"`
}

type Cache struct {
	client *redis.Client
}

func NewCache(client *redis.Client) *Cache {
	return &Cache{client: client}
}

func (c *Cache) Get(ctx context.Context, key string, dest any) bool {
	if c.client == nil {
		return false
	}

	raw, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if err != redis.Nil {
			slog.Debug("reading from the database instead", "key", key, "error", err)
		}
		return false
	}

	var stored envelope
	if err := json.Unmarshal(raw, &stored); err != nil {
		slog.Debug("reading from the database instead", "key", key, "error", err)
		return false
	}

	if len(stored.V) == 0 {
		return true
	}

	if err := json.Unmarshal(stored.V, dest); err != nil {
		slog.Debug("reading from the database instead", "key", key, "error", err)
		return false
	}

	return true
}

func (c *Cache) Set(ctx context.Context, key string, value any) {
	if c.client == nil {
		return
	}

	raw, err := json.Marshal(map[string]any{"v": value})
	if err != nil {
		slog.Debug("could not store", "key", key, "error", err)
		return
	}

	if err := c.client.Set(ctx, key, raw, TTL).Err(); err != nil {
		slog.Debug("could not store", "key", key, "error", err)
	}
}

func (c *Cache) Forget(ctx context.Context, keys ...string) {
	if c.client == nil || len(keys) == 0 {
		return
	}

	if err := c.client.Del(ctx, keys...).Err(); err != nil {
		slog.Warn("could not drop cached keys", "keys", keys, "error", err)
	}
}
