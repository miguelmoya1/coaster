package service

import (
	"context"

	"api-go/internal/core/ports"
)

// The cache keys, the same as CacheKeys in Nest so both can share one Redis. A service that
// changes one of these rows forgets its key after saving.

func userRoleCacheKey(userID string) string { return "user:" + userID + ":role" }

func userCacheKey(userID string) string { return "user:" + userID }

func membershipCacheKey(establishmentID, userID string) string {
	return "establishment:" + establishmentID + ":member:" + userID
}

func modulesCacheKey(establishmentID string) string {
	return "establishment:" + establishmentID + ":modules"
}

func subscriptionCacheKey(establishmentID string) string {
	return "establishment:" + establishmentID + ":subscription"
}

// remember returns the cached value of key, or loads it and caches it. A value that was
// cached as null or missing counts as cached, so a lookup that found nothing stays cheap.
func remember[T any](ctx context.Context, cache ports.Cache, key string, load func() (T, error)) (T, error) {
	var cached T
	if cache.Get(ctx, key, &cached) {
		return cached, nil
	}

	value, err := load()
	if err != nil {
		return value, err
	}

	cache.Set(ctx, key, value)

	return value, nil
}
