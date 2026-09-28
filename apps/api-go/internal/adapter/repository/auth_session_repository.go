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
	//go:embed queries/auth_session/insert.sql
	insertAuthSessionQuery string
	//go:embed queries/auth_session/find_by_token_hash.sql
	findAuthSessionByTokenHashQuery string
	//go:embed queries/auth_session/list_live_of.sql
	listLiveAuthSessionsQuery string
	//go:embed queries/auth_session/find_owned_by.sql
	findOwnedAuthSessionQuery string
	//go:embed queries/auth_session/mark_rotated.sql
	markAuthSessionRotatedQuery string
	//go:embed queries/auth_session/revoke_family.sql
	revokeAuthSessionFamilyQuery string
	//go:embed queries/auth_session/revoke_every_other_session_of.sql
	revokeEveryOtherAuthSessionQuery string
	//go:embed queries/auth_session/revoke_every_other_family_of.sql
	revokeEveryOtherAuthSessionFamilyQuery string
	//go:embed queries/auth_session/revoke_every_session_of.sql
	revokeEveryAuthSessionQuery string
	//go:embed queries/auth_session/delete_expired_of.sql
	deleteExpiredAuthSessionsQuery string
)

type AuthSessionRepository struct {
	pool *pgxpool.Pool
}

func NewAuthSessionRepository(pool *pgxpool.Pool) *AuthSessionRepository {
	return &AuthSessionRepository{pool: pool}
}

func (r *AuthSessionRepository) Create(ctx context.Context, session domain.NewAuthSession) (*domain.AuthSession, error) {
	return insertAuthSession(ctx, r.pool, session)
}

func (r *AuthSessionRepository) FindByTokenHash(ctx context.Context, tokenHash string) (*domain.AuthSession, error) {
	return scanAuthSession(r.pool.QueryRow(ctx, findAuthSessionByTokenHashQuery, tokenHash))
}

func (r *AuthSessionRepository) ListLiveOf(ctx context.Context, userID string) ([]domain.AuthSession, error) {
	rows, err := r.pool.Query(ctx, listLiveAuthSessionsQuery, userID, now())
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AuthSession, error) {
		session, err := scanAuthSession(row)
		if err != nil {
			return domain.AuthSession{}, err
		}
		return *session, nil
	})
}

func (r *AuthSessionRepository) FindOwnedBy(ctx context.Context, id, userID string) (*domain.AuthSession, error) {
	return scanAuthSession(r.pool.QueryRow(ctx, findOwnedAuthSessionQuery, id, userID))
}

func (r *AuthSessionRepository) Rotate(ctx context.Context, currentID string, next domain.NewAuthSession) (*domain.AuthSession, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, markAuthSessionRotatedQuery, currentID, now()); err != nil {
		return nil, err
	}

	created, err := insertAuthSession(ctx, tx, next)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return created, nil
}

func (r *AuthSessionRepository) RevokeFamily(ctx context.Context, familyID string) error {
	_, err := r.pool.Exec(ctx, revokeAuthSessionFamilyQuery, familyID, now())
	return err
}

func (r *AuthSessionRepository) RevokeEveryOtherSessionOf(ctx context.Context, userID, keepID string) error {
	_, err := r.pool.Exec(ctx, revokeEveryOtherAuthSessionQuery, userID, keepID, now())
	return err
}

func (r *AuthSessionRepository) RevokeEveryOtherFamilyOf(ctx context.Context, userID, keepFamilyID string) error {
	_, err := r.pool.Exec(ctx, revokeEveryOtherAuthSessionFamilyQuery, userID, keepFamilyID, now())
	return err
}

func (r *AuthSessionRepository) RevokeEverySessionOf(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, revokeEveryAuthSessionQuery, userID, now())
	return err
}

func (r *AuthSessionRepository) DeleteExpiredOf(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, deleteExpiredAuthSessionsQuery, userID, now())
	return err
}

func insertAuthSession(ctx context.Context, db querier, session domain.NewAuthSession) (*domain.AuthSession, error) {
	createdAt := now()

	stored := domain.AuthSession{
		ID:         uuid.NewV4().String(),
		UserID:     session.UserID,
		TokenHash:  session.TokenHash,
		FamilyID:   session.FamilyID,
		UserAgent:  nullIfEmpty(session.Origin.UserAgent),
		IP:         nullIfEmpty(session.Origin.IP),
		CreatedAt:  createdAt,
		LastUsedAt: createdAt,
		ExpiresAt:  session.ExpiresAt.UTC(),
	}

	_, err := db.Exec(ctx, insertAuthSessionQuery,
		stored.ID, stored.UserID, stored.TokenHash, stored.FamilyID,
		stored.UserAgent, stored.IP, stored.CreatedAt, stored.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}

	return &stored, nil
}

func scanAuthSession(row pgx.Row) (*domain.AuthSession, error) {
	var session domain.AuthSession

	err := row.Scan(
		&session.ID, &session.UserID, &session.TokenHash, &session.FamilyID, &session.UserAgent, &session.IP,
		&session.CreatedAt, &session.LastUsedAt, &session.ExpiresAt, &session.RotatedAt, &session.RevokedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &session, nil
}
