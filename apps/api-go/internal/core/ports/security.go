package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

// SecurityRepository reads what the route checks need. Every finder returns nil (or "")
// with a nil error when there is nothing to find.
type SecurityRepository interface {
	UserRole(ctx context.Context, userID string) (domain.Role, error)
	// Membership ignores memberships removed from the establishment.
	Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error)
	// EnabledModules returns the modules as stored, and false when the establishment has no settings row.
	EnabledModules(ctx context.Context, establishmentID string) ([]domain.EstablishmentModule, bool, error)
	SubscriptionState(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error)
}

// SubscriptionRefresher asks Stripe for a subscription the database says has lapsed, and
// stores what Stripe answers. P2e implements it; until then there is none.
type SubscriptionRefresher interface {
	Refresh(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error)
}

// Cache keeps values as JSON for a while. It never fails: without Redis, or when Redis is
// down, Get misses and Set and Forget do nothing.
type Cache interface {
	// Get reads key into dest and reports whether it was there.
	Get(ctx context.Context, key string, dest any) bool
	Set(ctx context.Context, key string, value any)
	Forget(ctx context.Context, keys ...string)
}

// RateLimit is the state of one throttle counter after a hit.
type RateLimit struct {
	TotalHits int
	// TimeToExpire is how many seconds are left in the window.
	TimeToExpire int
	Blocked      bool
	// TimeToBlockExpire is how many seconds the block still lasts.
	TimeToBlockExpire int
}

// RateLimiter counts requests for the throttle middleware, like Nest's ThrottlerStorage.
type RateLimiter interface {
	// Hit adds one request to key. Past limit the key is blocked for blockDuration.
	Hit(ctx context.Context, key string, ttl time.Duration, limit int, blockDuration time.Duration) RateLimit
}
