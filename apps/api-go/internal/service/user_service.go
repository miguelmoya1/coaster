package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// UserService is the users module: a user changing their own profile.
type UserService struct {
	users  ports.UserRepository
	events ports.EventPublisher
	cache  ports.Cache
}

func NewUserService(users ports.UserRepository, events ports.EventPublisher, cache ports.Cache) *UserService {
	return &UserService{users: users, events: events, cache: cache}
}

// UpdateProfile is UpdateUserCommand. An empty language leaves the preferences alone, as in Nest.
func (s *UserService) UpdateProfile(ctx context.Context, userID string, changes domain.UserProfileChanges) error {
	exists, err := s.users.Exists(ctx, userID)
	if err != nil {
		return err
	}
	if !exists {
		return domain.NotFound(domain.CodeUserNotFound)
	}

	if changes.Language != nil && *changes.Language == "" {
		changes.Language = nil
	}

	if err := s.users.UpdateProfile(ctx, userID, changes); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.UserUpdated{UserID: userID})
	return nil
}

// ForgetCache is ForgetUserCacheHandler: after a user changes (here or in admin), the next
// request reads the user and their role from the database.
func (s *UserService) ForgetCache(ctx context.Context, event ports.Event) {
	if updated, ok := event.(domain.UserUpdated); ok {
		s.cache.Forget(ctx, userRoleCacheKey(updated.UserID), userCacheKey(updated.UserID))
	}
}
