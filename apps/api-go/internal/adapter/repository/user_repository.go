package repository

import (
	"context"
	_ "embed"
	"uuid"

	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/user/exists.sql
	userExistsQuery string
	//go:embed queries/user/update_profile.sql
	updateUserProfileQuery string
	//go:embed queries/user/save_language.sql
	saveUserLanguageQuery string
)

// UserRepository writes the users' own profiles: the "User" row and its "UserPreferences".
type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Exists(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, userExistsQuery, userID).Scan(&exists)
	return exists, err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, userID string, changes domain.UserProfileChanges) error {
	updatedAt := now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if changes.Name != nil || changes.PhotoURL != nil || changes.ClearPhotoURL {
		_, err := tx.Exec(ctx, updateUserProfileQuery, userID, changes.Name, changes.PhotoURL, changes.ClearPhotoURL, updatedAt)
		if err != nil {
			return err
		}
	}

	if changes.Language != nil {
		_, err := tx.Exec(ctx, saveUserLanguageQuery, uuid.NewV4().String(), userID, *changes.Language, updatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
