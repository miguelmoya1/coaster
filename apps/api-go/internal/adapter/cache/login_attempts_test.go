package cache

import (
	"context"
	"testing"
	"time"
)

func TestLoginAttemptsInMemory(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	attempts := NewLoginAttempts(nil)
	attempts.now = func() time.Time { return now }

	for range LoginFailureLimit - 1 {
		attempts.Remember(ctx, "Ana@example.com")
	}
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait != 0 {
		t.Fatalf("LockedFor below the limit = %d", wait)
	}

	attempts.Remember(ctx, " ana@EXAMPLE.com ")
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait != int(LoginLock.Seconds()) {
		t.Fatalf("LockedFor at the limit = %d", wait)
	}

	now = now.Add(LoginLock)
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait != 0 {
		t.Fatalf("LockedFor after the lock = %d", wait)
	}

	for range LoginFailureLimit {
		attempts.Remember(ctx, "ana@example.com")
	}
	attempts.Forget(ctx, "ana@example.com")
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait != 0 {
		t.Fatalf("LockedFor after Forget = %d", wait)
	}
}

func TestLoginAttemptsOnRedis(t *testing.T) {
	resetRedis(t)
	ctx := context.Background()
	attempts := NewLoginAttempts(testClient)

	for range LoginFailureLimit - 1 {
		attempts.Remember(ctx, "ana@example.com")
	}
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait != 0 {
		t.Fatalf("LockedFor below the limit = %d", wait)
	}

	attempts.Remember(ctx, "ana@example.com")
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait < 890 || wait > 900 {
		t.Fatalf("LockedFor at the limit = %d", wait)
	}

	if testClient.Exists(ctx, loginFailuresKey("ana@example.com")).Val() != 1 {
		t.Fatalf("the failures must be under Nest's key")
	}

	attempts.Forget(ctx, "ana@example.com")
	if wait := attempts.LockedFor(ctx, "ana@example.com"); wait != 0 {
		t.Fatalf("LockedFor after Forget = %d", wait)
	}
}

func TestLoginFailuresKey(t *testing.T) {
	// sha256("ana@example.com"), as login-attempts.service.ts computes it.
	want := "auth:login-failures:8e43ca37701228e74983efdbd0cff5c16b3b1e5d4e29a7c05626d4d25a018e11"
	if got := loginFailuresKey(" Ana@Example.com "); got != want {
		t.Fatalf("key = %s, want %s", got, want)
	}
}
