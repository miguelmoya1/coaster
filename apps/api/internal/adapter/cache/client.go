package cache

import (
	"log/slog"

	"github.com/redis/go-redis/v9"
)

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
