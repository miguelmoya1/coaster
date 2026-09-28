package ports

import (
	"context"
	"time"

	"api-go/internal/core/domain"
)

type SecurityRepository interface {
	UserRole(ctx context.Context, userID string) (domain.Role, error)

	Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error)

	EnabledModules(ctx context.Context, establishmentID string) ([]domain.EstablishmentModule, bool, error)
	SubscriptionState(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error)
}

type SubscriptionRefresher interface {
	Refresh(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error)
}

type Cache interface {
	Get(ctx context.Context, key string, dest any) bool
	Set(ctx context.Context, key string, value any)
	Forget(ctx context.Context, keys ...string)
}

type RateLimit struct {
	TotalHits int

	TimeToExpire int
	Blocked      bool

	TimeToBlockExpire int
}

type RateLimiter interface {
	Hit(ctx context.Context, key string, ttl time.Duration, limit int, blockDuration time.Duration) RateLimit
}
