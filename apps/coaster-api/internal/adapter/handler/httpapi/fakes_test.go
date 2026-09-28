package httpapi

import (
	"context"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

var testUser = domain.User{ID: "u1", Email: "ana@example.com", Name: "Ana", Active: true, Role: domain.RoleUser, Language: "es"}

type fakeTokens struct{}

func (fakeTokens) Resolve(_ context.Context, authorization string) (*domain.Caller, error) {
	if authorization != "Bearer good" {
		return nil, nil
	}
	user := testUser
	return &domain.Caller{Claims: domain.SessionClaims{Sub: user.ID, Sid: "s1"}, User: &user}, nil
}

type fakeAccess struct {
	platformRole domain.Role
	role         domain.EstablishmentRole
	modules      []domain.EstablishmentModule
}

func (a fakeAccess) UserRole(context.Context, string) (domain.Role, error) {
	if a.platformRole == "" {
		return domain.RoleUser, nil
	}
	return a.platformRole, nil
}

func (a fakeAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	if a.role == "" {
		return nil, nil
	}
	return &domain.Membership{Role: string(a.role), Active: true}, nil
}

func (a fakeAccess) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, error) {
	return a.modules, nil
}

func (fakeAccess) SubscriptionActive(context.Context, string) (bool, error) { return true, nil }

type countingLimiter struct{ hits map[string]int }

func (l *countingLimiter) Hit(_ context.Context, key string, ttl time.Duration, limit int, _ time.Duration) ports.RateLimit {
	l.hits[key]++
	return ports.RateLimit{TotalHits: l.hits[key], TimeToExpire: int(ttl.Seconds()), Blocked: l.hits[key] > limit, TimeToBlockExpire: int(ttl.Seconds())}
}

type discardEvents struct{}

func (discardEvents) Publish(context.Context, any) {}

type noCache struct{}

func (noCache) Get(context.Context, string, any) bool { return false }
func (noCache) Set(context.Context, string, any)      {}
func (noCache) Forget(context.Context, ...string)     {}

func testGuard(access ports.SecurityService) *middleware.Guard {
	return middleware.NewGuard(fakeTokens{}, access, &countingLimiter{hits: map[string]int{}}, 1)
}
