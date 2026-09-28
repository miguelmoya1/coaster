package service

import (
	"context"
	"strings"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type UserService struct {
	users  ports.UserRepository
	events ports.EventPublisher
	cache  ports.Cache
}

func NewUserService(users ports.UserRepository, events ports.EventPublisher, cache ports.Cache) *UserService {
	return &UserService{users: users, events: events, cache: cache}
}

func (s *UserService) UpdateProfile(ctx context.Context, userID string, changes domain.UserProfileChanges) error {
	exists, err := s.users.Exists(ctx, userID)
	if err != nil {
		return err
	}
	if !exists {
		return domain.NotFound(domain.CodeUserNotFound)
	}

	if changes.Name != nil {
		name := strings.TrimSpace(*changes.Name)
		if name == "" {
			return domain.BadRequest(domain.CodeRequired)
		}
		changes.Name = &name
	}
	if changes.Language != nil && !domain.IsLanguage(*changes.Language) {
		return domain.BadRequest(domain.CodeInvalidType)
	}

	if err := s.users.UpdateProfile(ctx, userID, changes); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.UserUpdatedEvent{UserID: userID})
	return nil
}

func (s *UserService) EventHandlers() []ports.EventHandler {
	return []ports.EventHandler{
		ports.On(s.forgetCache),
	}
}

func (s *UserService) forgetCache(ctx context.Context, event domain.UserUpdatedEvent) {
	s.cache.Forget(ctx, userRoleCacheKey(event.UserID), userCacheKey(event.UserID))
}
