package ports

import (
	"context"

	"api-go/internal/core/domain"
)

// UserRepository changes the users' own profiles.
type UserRepository interface {
	Exists(ctx context.Context, userID string) (bool, error)
	// UpdateProfile writes the changes of the user and their preferences in one transaction.
	UpdateProfile(ctx context.Context, userID string, changes domain.UserProfileChanges) error
}
