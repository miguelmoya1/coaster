package cache

import (
	"log/slog"

	"github.com/redis/go-redis/v9"
)

// NewClient connects to REDIS_URL. It returns nil when the URL is empty or unusable, and
// then nothing is cached, as in Nest.
func NewClient(url string) *redis.Client {
	if url == "" {
		slog.Warn("REDIS_URL is unset: nothing is cached and rooms live in this process only")
		return nil
	}

	options, err := redis.ParseURL(url)
	if err != nil {
		slog.Error("REDIS_URL is not a usable address; carrying on without a cache", "error", err)
		return nil
	}

	options.ClientName = "coaster-cache"
	options.MaxRetries = 1

	return redis.NewClient(options)
}
