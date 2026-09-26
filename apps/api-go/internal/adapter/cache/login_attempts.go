package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// The limits of login-attempts.service.ts: ten failures within 15 minutes lock the address
// for 15 minutes.
const (
	LoginFailureLimit  = 10
	LoginFailureWindow = 15 * time.Minute
	LoginLock          = 15 * time.Minute
)

var countLoginFailure = redis.NewScript(`
local failures = redis.call('INCR', KEYS[1])

if failures == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end

if failures >= tonumber(ARGV[2]) then
  redis.call('EXPIRE', KEYS[1], ARGV[3])
end

return { failures, redis.call('TTL', KEYS[1]) }
`)

var readLoginFailures = redis.NewScript(`
return { tonumber(redis.call('GET', KEYS[1])) or 0, redis.call('TTL', KEYS[1]) }
`)

// LoginAttempts is ports.LoginAttempts: Redis when there is a client, and a map in memory
// without one or when Redis fails.
type LoginAttempts struct {
	client *redis.Client

	mu     sync.Mutex
	memory map[string]failureRun
	now    func() time.Time
}

type failureRun struct {
	failures  int
	expiresAt time.Time
}

func NewLoginAttempts(client *redis.Client) *LoginAttempts {
	return &LoginAttempts{client: client, memory: map[string]failureRun{}, now: time.Now}
}

func (a *LoginAttempts) LockedFor(ctx context.Context, email string) int {
	key := loginFailuresKey(email)

	if a.client != nil {
		result, err := readLoginFailures.Run(ctx, a.client, []string{key}).Int64Slice()
		if err == nil && len(result) == 2 {
			return waitOf(int(result[0]), int(result[1]))
		}
		slog.Debug("counting attempts in memory instead", "error", err)
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	run, ok := a.runOf(key)
	if !ok {
		return 0
	}

	return waitOf(run.failures, int(math.Ceil(run.expiresAt.Sub(a.now()).Seconds())))
}

func (a *LoginAttempts) Remember(ctx context.Context, email string) {
	key := loginFailuresKey(email)

	if a.client != nil {
		err := countLoginFailure.Run(ctx, a.client, []string{key},
			int(LoginFailureWindow.Seconds()), LoginFailureLimit, int(LoginLock.Seconds()),
		).Err()
		if err == nil {
			return
		}
		slog.Debug("counting attempts in memory instead", "error", err)
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	run, _ := a.runOf(key)
	failures := run.failures + 1

	lasts := LoginFailureWindow
	if failures >= LoginFailureLimit {
		lasts = LoginLock
	}

	a.sweep()
	a.memory[key] = failureRun{failures: failures, expiresAt: a.now().Add(lasts)}
}

func (a *LoginAttempts) Forget(ctx context.Context, email string) {
	key := loginFailuresKey(email)

	a.mu.Lock()
	delete(a.memory, key)
	a.mu.Unlock()

	if a.client == nil {
		return
	}

	if err := a.client.Del(ctx, key).Err(); err != nil {
		slog.Debug("could not clear login failures", "key", key, "error", err)
	}
}

// runOf returns the live run of key, dropping it once it has expired. The caller holds mu.
func (a *LoginAttempts) runOf(key string) (failureRun, bool) {
	run, ok := a.memory[key]
	if !ok {
		return failureRun{}, false
	}

	if !run.expiresAt.After(a.now()) {
		delete(a.memory, key)
		return failureRun{}, false
	}

	return run, true
}

// sweep drops expired runs once there are many. The caller holds mu.
func (a *LoginAttempts) sweep() {
	if len(a.memory) < memoryHighWaterMark {
		return
	}

	now := a.now()
	for key, run := range a.memory {
		if !run.expiresAt.After(now) {
			delete(a.memory, key)
		}
	}
}

func loginFailuresKey(email string) string {
	sum := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(email))))
	return "auth:login-failures:" + hex.EncodeToString(sum[:])
}

func waitOf(failures, ttl int) int {
	if failures < LoginFailureLimit {
		return 0
	}
	return max(ttl, 1)
}
