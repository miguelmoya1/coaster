package repository

import (
	"context"
	_ "embed"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/auth_identity/find_user_id_by_subject.sql
	findIdentityUserIDQuery string
	//go:embed queries/auth_identity/touch.sql
	touchIdentityQuery string
	//go:embed queries/auth_identity/link.sql
	linkIdentityQuery string
	//go:embed queries/auth_identity/list_of_user.sql
	listUserIdentitiesQuery string
	//go:embed queries/auth_identity/delete.sql
	deleteIdentityQuery string
)

type AuthIdentityRepository struct {
	pool *pgxpool.Pool
}

func NewAuthIdentityRepository(pool *pgxpool.Pool) *AuthIdentityRepository {
	return &AuthIdentityRepository{pool: pool}
}

func (r *AuthIdentityRepository) FindUserBySubject(ctx context.Context, provider domain.AuthProvider, subject string) (*domain.AuthUser, error) {
	var userID string

	err := r.pool.QueryRow(ctx, findIdentityUserIDQuery, string(provider), subject).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return scanAuthUser(r.pool.QueryRow(ctx, findAuthUserByIDQuery, userID))
}

func (r *AuthIdentityRepository) Touch(ctx context.Context, provider domain.AuthProvider, subject string) error {
	_, err := r.pool.Exec(ctx, touchIdentityQuery, string(provider), subject, now())
	return err
}

func (r *AuthIdentityRepository) Link(ctx context.Context, userID string, identity domain.NewIdentity) error {
	_, err := r.pool.Exec(ctx, linkIdentityQuery,
		uuid.NewV4().String(), userID, string(identity.Provider), identity.Subject, identity.Email, now(),
	)
	return err
}

func (r *AuthIdentityRepository) ListOf(ctx context.Context, userID string) ([]domain.AuthIdentity, error) {
	rows, err := r.pool.Query(ctx, listUserIdentitiesQuery, userID)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AuthIdentity, error) {
		var identity domain.AuthIdentity
		var provider string

		err := row.Scan(&provider, &identity.Subject, &identity.Email, &identity.CreatedAt)
		identity.Provider = domain.AuthProvider(provider)

		return identity, err
	})
}

func (r *AuthIdentityRepository) Delete(ctx context.Context, userID string, provider domain.AuthProvider) error {
	_, err := r.pool.Exec(ctx, deleteIdentityQuery, userID, string(provider))
	return err
}
