package cache

import (
	"context"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"api-go/internal/core/ports"
)

// countHit is the script of throttler-cache.storage.ts: one counter per key and window,
// which lives blockDuration more once the limit is passed.
var countHit = redis.NewScript(`
local hits = redis.call('INCR', KEYS[1])

if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end

if hits == tonumber(ARGV[2]) + 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
end

return { hits, redis.call('PTTL', KEYS[1]) }
`)

// throttlerName is the name of the only throttler, "default" in Nest.
const throttlerName = "default"

// memoryHighWaterMark is how many keys the memory counter keeps before sweeping idle ones.
const memoryHighWaterMark = 10_000

// RateLimiter is ports.RateLimiter: Redis when there is a client, and a counter in memory
// without one or when Redis fails.
type RateLimiter struct {
	client *redis.Client
	memory *memoryRateLimiter
}

func NewRateLimiter(client *redis.Client) *RateLimiter {
	return &RateLimiter{client: client, memory: newMemoryRateLimiter()}
}

func (l *RateLimiter) Hit(ctx context.Context, key string, ttl time.Duration, limit int, blockDuration time.Duration) ports.RateLimit {
	if l.client == nil {
		return l.memory.hit(key, ttl, limit, blockDuration)
	}

	result, err := countHit.Run(ctx, l.client, []string{"throttle:" + throttlerName + ":" + key},
		ttl.Milliseconds(), limit, blockDuration.Milliseconds(),
	).Int64Slice()
	if err != nil || len(result) != 2 {
		slog.Debug("counting requests in memory instead", "error", err)
		return l.memory.hit(key, ttl, limit, blockDuration)
	}

	hits := int(result[0])
	timeToExpire := int(math.Ceil(float64(result[1]) / 1000))

	return ports.RateLimit{
		TotalHits:         hits,
		TimeToExpire:      timeToExpire,
		Blocked:           hits > limit,
		TimeToBlockExpire: timeToExpire,
	}
}

// memoryRateLimiter copies ThrottlerStorageService of @nestjs/throttler: every hit counts
// for ttl after it happened, and past the limit the key is blocked for blockDuration.
type memoryRateLimiter struct {
	mu      sync.Mutex
	records map[string]*hitRecord
	now     func() time.Time
}

type hitRecord struct {
	// hits holds when each counted hit stops counting.
	hits           []time.Time
	expiresAt      time.Time
	blocked        bool
	blockExpiresAt time.Time
}

func newMemoryRateLimiter() *memoryRateLimiter {
	return &memoryRateLimiter{records: map[string]*hitRecord{}, now: time.Now}
}

func (m *memoryRateLimiter) hit(key string, ttl time.Duration, limit int, blockDuration time.Duration) ports.RateLimit {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := m.now()

	record, ok := m.records[key]
	if !ok {
		m.sweep(now)
		record = &hitRecord{expiresAt: now.Add(ttl)}
		m.records[key] = record
	}
	record.dropExpiredHits(now)

	timeToExpire := secondsUntil(now, record.expiresAt)
	if timeToExpire <= 0 {
		record.expiresAt = now.Add(ttl)
		timeToExpire = secondsUntil(now, record.expiresAt)
	}

	if !record.blocked {
		record.hits = append(record.hits, now.Add(ttl))
	}

	if len(record.hits) > limit && !record.blocked {
		record.blocked = true
		record.blockExpiresAt = now.Add(blockDuration)
	}

	timeToBlockExpire := secondsUntil(now, record.blockExpiresAt)
	if timeToBlockExpire <= 0 && record.blocked {
		record.blocked = false
		record.hits = []time.Time{now.Add(ttl)}
	}

	return ports.RateLimit{
		TotalHits:         len(record.hits),
		TimeToExpire:      timeToExpire,
		Blocked:           record.blocked,
		TimeToBlockExpire: timeToBlockExpire,
	}
}

func (r *hitRecord) dropExpiredHits(now time.Time) {
	kept := r.hits[:0]
	for _, until := range r.hits {
		if until.After(now) {
			kept = append(kept, until)
		}
	}
	r.hits = kept
}

// sweep forgets idle keys once there are many, so the map does not grow for ever.
func (m *memoryRateLimiter) sweep(now time.Time) {
	if len(m.records) < memoryHighWaterMark {
		return
	}

	for key, record := range m.records {
		record.dropExpiredHits(now)
		if len(record.hits) == 0 && !record.blocked {
			delete(m.records, key)
		}
	}
}

// secondsUntil rounds up like Math.ceil in Nest; it is negative once t has passed.
func secondsUntil(now, t time.Time) int {
	return int(math.Ceil(t.Sub(now).Seconds()))
}
