package service

import (
	"context"

	"coaster-api/internal/core/ports"
)

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
