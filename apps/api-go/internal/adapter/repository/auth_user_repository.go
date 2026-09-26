package repository

import (
	"context"
	_ "embed"
	"errors"
	"strings"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/auth_user/find_by_id.sql
	findAuthUserByIDQuery string
	//go:embed queries/auth_user/find_by_email.sql
	findAuthUserByEmailQuery string
	//go:embed queries/auth_user/insert.sql
	insertUserQuery string
	//go:embed queries/auth_user/insert_preferences.sql
	insertUserPreferencesQuery string
	//go:embed queries/auth_user/set_password.sql
	setUserPasswordQuery string
	//go:embed queries/auth_user/mark_email_verified.sql
	markUserEmailVerifiedQuery string
	//go:embed queries/auth_user/claim_for_google.sql
	claimUserForGoogleQuery string
	//go:embed queries/auth_user/is_beta_tester.sql
	isBetaTesterQuery string
)

// AuthUserRepository reads and writes the "User" rows for signing in.
type AuthUserRepository struct {
	pool *pgxpool.Pool
}

func NewAuthUserRepository(pool *pgxpool.Pool) *AuthUserRepository {
	return &AuthUserRepository{pool: pool}
}

func (r *AuthUserRepository) FindByID(ctx context.Context, id string) (*domain.AuthUser, error) {
	return scanAuthUser(r.pool.QueryRow(ctx, findAuthUserByIDQuery, id))
}

func (r *AuthUserRepository) FindByEmail(ctx context.Context, email string) (*domain.AuthUser, error) {
	return scanAuthUser(r.pool.QueryRow(ctx, findAuthUserByEmailQuery, strings.ToLower(strings.TrimSpace(email))))
}

func (r *AuthUserRepository) Create(ctx context.Context, user domain.NewUser) (*domain.AuthUser, error) {
	id := uuid.NewV4().String()
	createdAt := now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, insertUserQuery,
		id, user.Email, user.Name, user.PhotoURL, user.PasswordHash,
		utcOrNil(user.PasswordUpdatedAt), utcOrNil(user.EmailVerifiedAt), createdAt,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, insertUserPreferencesQuery, uuid.NewV4().String(), id, user.Language, createdAt)
	if err != nil {
		return nil, err
	}

	if user.Identity != nil {
		_, err = tx.Exec(ctx, linkIdentityQuery,
			uuid.NewV4().String(), id, string(user.Identity.Provider), user.Identity.Subject, user.Identity.Email, createdAt,
		)
		if err != nil {
			return nil, err
		}
	}

	created, err := scanAuthUser(tx.QueryRow(ctx, findAuthUserByIDQuery, id))
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return created, nil
}

func (r *AuthUserRepository) SetPassword(ctx context.Context, userID, passwordHash string, markEmailVerified bool) error {
	_, err := r.pool.Exec(ctx, setUserPasswordQuery, userID, passwordHash, now(), markEmailVerified)
	return err
}

func (r *AuthUserRepository) MarkEmailVerified(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, markUserEmailVerifiedQuery, userID, now())
	return err
}

func (r *AuthUserRepository) ClaimForGoogle(ctx context.Context, userID string, dropPassword bool, photoURL *string) error {
	_, err := r.pool.Exec(ctx, claimUserForGoogleQuery, userID, dropPassword, photoURL, now())
	return err
}

func (r *AuthUserRepository) IsBetaTester(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, isBetaTesterQuery, email).Scan(&exists)
	return exists, err
}

// scanAuthUser reads a row of find_by_id.sql or find_by_email.sql, or nil when there is none.
func scanAuthUser(row pgx.Row) (*domain.AuthUser, error) {
	var user domain.AuthUser
	var role string

	err := row.Scan(
		&user.ID, &user.Email, &user.Name, &user.PhotoURL, &user.PasswordHash,
		&user.EmailVerifiedAt, &user.Active, &role, &user.Language,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	user.Role = domain.Role(role)

	return &user, nil
}
