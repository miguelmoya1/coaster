package service

import (
	"context"
	"log/slog"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// SecurityService answers the route checks: platform role, membership, modules and
// subscription. Every answer goes through the cache.
type SecurityService struct {
	repo      ports.SecurityRepository
	cache     ports.Cache
	refresher ports.SubscriptionRefresher
	now       func() time.Time
}

// NewSecurityService builds the service. refresher can be nil: without it a lapsed
// subscription is not checked against Stripe.
func NewSecurityService(repo ports.SecurityRepository, cache ports.Cache, refresher ports.SubscriptionRefresher) *SecurityService {
	return &SecurityService{repo: repo, cache: cache, refresher: refresher, now: time.Now}
}

// UserRole is the platform role of a user, or "" when there is no such user.
func (s *SecurityService) UserRole(ctx context.Context, userID string) (domain.Role, error) {
	return remember(ctx, s.cache, userRoleCacheKey(userID), func() (domain.Role, error) {
		return s.repo.UserRole(ctx, userID)
	})
}

// Membership is the user's live membership of the establishment, or nil.
func (s *SecurityService) Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error) {
	return remember(ctx, s.cache, membershipCacheKey(establishmentID, userID), func() (*domain.Membership, error) {
		return s.repo.Membership(ctx, userID, establishmentID)
	})
}

// EnabledModules are the modules the establishment runs. One without settings runs them all.
func (s *SecurityService) EnabledModules(ctx context.Context, establishmentID string) ([]domain.EstablishmentModule, error) {
	return remember(ctx, s.cache, modulesCacheKey(establishmentID), func() ([]domain.EstablishmentModule, error) {
		modules, found, err := s.repo.EnabledModules(ctx, establishmentID)
		if err != nil {
			return nil, err
		}

		if !found {
			slog.Warn("establishment has no settings row; assuming every module is on", "establishmentId", establishmentID)
			return domain.ResolveModules(domain.DefaultEstablishmentModules), nil
		}

		return domain.ResolveModules(modules), nil
	})
}

// SubscriptionState is the establishment's subscription, or nil when it has none.
func (s *SecurityService) SubscriptionState(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error) {
	return remember(ctx, s.cache, subscriptionCacheKey(establishmentID), func() (*domain.SubscriptionState, error) {
		return s.repo.SubscriptionState(ctx, establishmentID)
	})
}

// SubscriptionActive reports whether the establishment may still change things. When the
// stored subscription says no but it came from Stripe, it asks Stripe before refusing.
func (s *SecurityService) SubscriptionActive(ctx context.Context, establishmentID string) (bool, error) {
	state, err := s.SubscriptionState(ctx, establishmentID)
	if err != nil {
		return false, err
	}

	if domain.SubscriptionGrantsAccess(state, s.now()) {
		return true, nil
	}

	return domain.SubscriptionGrantsAccess(s.healFromStripe(ctx, establishmentID, state), s.now()), nil
}

// healFromStripe asks Stripe about a subscription that has a Stripe id. If there is no
// refresher, or Stripe cannot be reached, the stored state stands.
func (s *SecurityService) healFromStripe(ctx context.Context, establishmentID string, stale *domain.SubscriptionState) *domain.SubscriptionState {
	if stale == nil || stale.StripeSubscriptionID == nil || *stale.StripeSubscriptionID == "" || s.refresher == nil {
		return stale
	}

	fresh, err := s.refresher.Refresh(ctx, establishmentID)
	if err != nil {
		slog.Error("could not check the subscription against Stripe", "establishmentId", establishmentID, "error", err)
		return stale
	}
	if fresh == nil {
		return stale
	}

	return fresh
}
