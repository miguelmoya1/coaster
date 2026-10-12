package service

import (
	"context"
	"log/slog"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type SecurityService struct {
	repo      ports.SecurityRepository
	cache     ports.Cache
	refresher ports.SubscriptionRefresher
	now       func() time.Time
}

func NewSecurityService(repo ports.SecurityRepository, cache ports.Cache, refresher ports.SubscriptionRefresher) *SecurityService {
	return &SecurityService{repo: repo, cache: cache, refresher: refresher, now: time.Now}
}

func (s *SecurityService) UserRole(ctx context.Context, userID string) (domain.Role, error) {
	return remember(ctx, s.cache, userRoleCacheKey(userID), func() (domain.Role, error) {
		return s.repo.UserRole(ctx, userID)
	})
}

func (s *SecurityService) Membership(ctx context.Context, userID, establishmentID string) (*domain.Membership, error) {
	return remember(ctx, s.cache, membershipCacheKey(establishmentID, userID), func() (*domain.Membership, error) {
		return s.repo.Membership(ctx, userID, establishmentID)
	})
}

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

func (s *SecurityService) SubscriptionState(ctx context.Context, establishmentID string) (*domain.SubscriptionState, error) {
	return remember(ctx, s.cache, subscriptionCacheKey(establishmentID), func() (*domain.SubscriptionState, error) {
		return s.repo.SubscriptionState(ctx, establishmentID)
	})
}

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
