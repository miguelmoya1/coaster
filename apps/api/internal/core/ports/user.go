package ports

import (
	"context"

	"coaster-api/internal/core/domain"
)

type UserRepository interface {
	Exists(ctx context.Context, userID string) (bool, error)

	UpdateProfile(ctx context.Context, userID string, changes domain.UserProfileChanges) error
}

type UserService interface {
	UpdateProfile(ctx context.Context, userID string, changes domain.UserProfileChanges) error
}
