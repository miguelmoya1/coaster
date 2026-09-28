package repository

import (
	"context"
	_ "embed"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/auth_token/burn_unused.sql
	burnUnusedAuthTokensQuery string
	//go:embed queries/auth_token/insert.sql
	insertAuthTokenQuery string
	//go:embed queries/auth_token/find_by_hash.sql
	findAuthTokenByHashQuery string
	//go:embed queries/auth_token/spend.sql
	spendAuthTokenQuery string
)

type AuthTokenRepository struct {
	pool *pgxpool.Pool
}

func NewAuthTokenRepository(pool *pgxpool.Pool) *AuthTokenRepository {
	return &AuthTokenRepository{pool: pool}
}

func (r *AuthTokenRepository) Issue(ctx context.Context, userID string, purpose domain.AuthTokenPurpose) (string, error) {
	token := domain.NewAuthToken()
	issuedAt := now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, burnUnusedAuthTokensQuery, userID, string(purpose), issuedAt); err != nil {
		return "", err
	}

	_, err = tx.Exec(ctx, insertAuthTokenQuery,
		uuid.NewV4().String(), userID, string(purpose), domain.HashAuthToken(token), issuedAt,
		domain.AuthTokenExpiry(purpose, issuedAt),
	)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return token, nil
}

func (r *AuthTokenRepository) FindUsable(ctx context.Context, token string, purpose domain.AuthTokenPurpose) (*domain.AuthToken, error) {
	var stored domain.AuthToken
	var storedPurpose string

	err := r.pool.QueryRow(ctx, findAuthTokenByHashQuery, domain.HashAuthToken(token)).
		Scan(&stored.ID, &stored.UserID, &storedPurpose, &stored.ExpiresAt, &stored.UsedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	stored.Purpose = domain.AuthTokenPurpose(storedPurpose)

	if stored.Purpose != purpose || stored.UsedAt != nil || !stored.ExpiresAt.After(now()) {
		return nil, nil
	}

	user, err := scanAuthUser(r.pool.QueryRow(ctx, findAuthUserByIDQuery, stored.UserID))
	if err != nil || user == nil {
		return nil, err
	}
	stored.User = *user

	return &stored, nil
}

func (r *AuthTokenRepository) Spend(ctx context.Context, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, spendAuthTokenQuery, id, now())
	if err != nil {
		return false, err
	}

	return tag.RowsAffected() == 1, nil
}
