package cache

import (
	"context"
	"testing"
	"time"
)

type cachedThing struct {
	Name string `json:"name"`
}

func TestCacheWithoutRedisCachesNothing(t *testing.T) {
	ctx := context.Background()
	cache := NewCache(nil)

	cache.Set(ctx, "k", cachedThing{Name: "a"})

	var got cachedThing
	if cache.Get(ctx, "k", &got) {
		t.Fatalf("Get without Redis must miss")
	}
	cache.Forget(ctx, "k")
}

func TestCacheOnRedis(t *testing.T) {
	resetRedis(t)
	ctx := context.Background()
	cache := NewCache(testClient)

	var got *cachedThing
	if cache.Get(ctx, "thing", &got) {
		t.Fatalf("Get of a missing key must miss")
	}

	cache.Set(ctx, "thing", cachedThing{Name: "a"})
	raw, _ := testClient.Get(ctx, "thing").Result()
	if raw != `{"v":{"name":"a"}}` {
		t.Fatalf("stored %s, want Nest's envelope", raw)
	}
	if ttl := testClient.TTL(ctx, "thing").Val(); ttl <= 7*time.Hour || ttl > TTL {
		t.Fatalf("TTL = %v, want 8h", ttl)
	}
	if !cache.Get(ctx, "thing", &got) || got == nil || got.Name != "a" {
		t.Fatalf("Get = %+v", got)
	}

	cache.Set(ctx, "nothing", nil)
	got = &cachedThing{Name: "old"}
	if !cache.Get(ctx, "nothing", &got) || got != nil {
		t.Fatalf("a cached null must be found as nil, got %+v", got)
	}

	testClient.Set(ctx, "undefined", "{}", TTL)
	var role string
	if !cache.Get(ctx, "undefined", &role) || role != "" {
		t.Fatalf("{} must be found as the zero value, got %q", role)
	}

	testClient.Set(ctx, "broken", "not json", TTL)
	if cache.Get(ctx, "broken", &role) {
		t.Fatalf("a value that cannot be read must miss")
	}

	cache.Forget(ctx, "thing", "nothing")
	if testClient.Exists(ctx, "thing", "nothing").Val() != 0 {
		t.Fatalf("Forget must delete the keys")
	}
}
