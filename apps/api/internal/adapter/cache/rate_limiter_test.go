package cache

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/ports"
)

func TestMemoryRateLimiter(t *testing.T) {
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	limiter := newMemoryRateLimiter()
	limiter.now = func() time.Time { return now }

	hit := func() ports.RateLimit { return limiter.hit("k", time.Minute, 2, time.Minute) }

	steps := []struct {
		name    string
		advance time.Duration
		want    ports.RateLimit
	}{
		{name: "first", want: ports.RateLimit{TotalHits: 1, TimeToExpire: 60, TimeToBlockExpire: secondsUntil(now, time.Time{})}},
		{name: "second", advance: 10 * time.Second, want: ports.RateLimit{TotalHits: 2, TimeToExpire: 50}},
		{name: "blocked", advance: 10 * time.Second, want: ports.RateLimit{TotalHits: 3, TimeToExpire: 40, Blocked: true, TimeToBlockExpire: 60}},
		{name: "still blocked, not counted", advance: 30 * time.Second, want: ports.RateLimit{TotalHits: 3, TimeToExpire: 10, Blocked: true, TimeToBlockExpire: 30}},
		{name: "block over", advance: 30 * time.Second, want: ports.RateLimit{TotalHits: 1, TimeToExpire: 60, TimeToBlockExpire: 0}},
	}

	for _, step := range steps {
		now = now.Add(step.advance)
		got := hit()
		if step.name == "first" || step.name == "second" {
			got.TimeToBlockExpire = step.want.TimeToBlockExpire
		}
		if got != step.want {
			t.Fatalf("%s: got %+v, want %+v", step.name, got, step.want)
		}
	}
}

func TestMemoryRateLimiterSlidesHits(t *testing.T) {
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	limiter := newMemoryRateLimiter()
	limiter.now = func() time.Time { return now }

	limiter.hit("k", time.Minute, 5, time.Minute)
	now = now.Add(40 * time.Second)
	limiter.hit("k", time.Minute, 5, time.Minute)
	now = now.Add(30 * time.Second)

	if got := limiter.hit("k", time.Minute, 5, time.Minute); got.TotalHits != 2 {
		t.Fatalf("TotalHits = %d, want 2", got.TotalHits)
	}
}

func TestRateLimiterOnRedis(t *testing.T) {
	resetRedis(t)
	ctx := context.Background()
	limiter := NewRateLimiter(testClient)

	for i := 1; i <= 2; i++ {
		got := limiter.Hit(ctx, "k", time.Minute, 2, 2*time.Minute)
		if got.TotalHits != i || got.Blocked || got.TimeToExpire != 60 {
			t.Fatalf("hit %d = %+v", i, got)
		}
	}

	got := limiter.Hit(ctx, "k", time.Minute, 2, 2*time.Minute)
	if got.TotalHits != 3 || !got.Blocked || got.TimeToBlockExpire != 120 {
		t.Fatalf("hit over the limit = %+v", got)
	}

	if !testClientHasKey(ctx, t, "throttle:default:k") {
		t.Fatalf("the counter must use Nest's key")
	}
}

func TestRateLimiterFallsBackToMemory(t *testing.T) {
	client := NewClient("redis://127.0.0.1:1")
	defer client.Close()
	limiter := NewRateLimiter(client)

	got := limiter.Hit(context.Background(), "k", time.Minute, 2, time.Minute)
	if got.TotalHits != 1 || got.Blocked {
		t.Fatalf("Hit with Redis down = %+v", got)
	}
}

func testClientHasKey(ctx context.Context, t *testing.T, key string) bool {
	t.Helper()
	return testClient.Exists(ctx, key).Val() == 1
}
