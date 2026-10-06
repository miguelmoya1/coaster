package repository

import (
	"context"
	_ "embed"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/admin_user/list.sql
	listAdminUsersQuery string
	//go:embed queries/admin_user/count.sql
	countAdminUsersQuery string
	//go:embed queries/admin_user/find_by_id.sql
	findAdminUserByIDQuery string
	//go:embed queries/admin_user/list_memberships.sql
	listAdminUserMembershipsQuery string
	//go:embed queries/admin_user/count_active_admins.sql
	countActiveAdminsQuery string
	//go:embed queries/admin_user/update.sql
	updateAdminUserQuery string
)

type AdminUserRepository struct {
	pool *pgxpool.Pool
}

func NewAdminUserRepository(pool *pgxpool.Pool) *AdminUserRepository {
	return &AdminUserRepository{pool: pool}
}

func (r *AdminUserRepository) List(ctx context.Context, filter domain.AdminUserFilter, page domain.PageRequest) ([]domain.AdminUserSummary, int, error) {
	search, role := nullIfEmpty(filter.Search), nullIfEmpty(string(filter.Role))

	rows, err := r.pool.Query(ctx, listAdminUsersQuery, search, role, filter.Active, page.PageSize, page.Offset())
	if err != nil {
		return nil, 0, err
	}
	users, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AdminUserSummary, error) {
		return scanAdminUser(row)
	})
	if err != nil {
		return nil, 0, err
	}

	var total int
	if err := r.pool.QueryRow(ctx, countAdminUsersQuery, search, role, filter.Active).Scan(&total); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *AdminUserRepository) FindByID(ctx context.Context, userID string) (*domain.AdminUserSummary, error) {
	user, err := scanAdminUser(r.pool.QueryRow(ctx, findAdminUserByIDQuery, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AdminUserRepository) Memberships(ctx context.Context, userID string) ([]domain.AdminUserMembership, error) {
	rows, err := r.pool.Query(ctx, listAdminUserMembershipsQuery, userID)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AdminUserMembership, error) {
		var membership domain.AdminUserMembership
		var role string
		err := row.Scan(&membership.EstablishmentID, &membership.EstablishmentName, &role, &membership.Active, &membership.JoinedAt)
		membership.Role = domain.EstablishmentRole(role)
		return membership, err
	})
}

func (r *AdminUserRepository) CountActiveAdmins(ctx context.Context) (int, error) {
	var admins int
	err := r.pool.QueryRow(ctx, countActiveAdminsQuery).Scan(&admins)
	return admins, err
}

func (r *AdminUserRepository) Update(ctx context.Context, userID string, changes domain.AdminUserChanges) error {
	var role *string
	if changes.Role != nil {
		value := string(*changes.Role)
		role = &value
	}

	_, err := r.pool.Exec(ctx, updateAdminUserQuery, userID, role, changes.Active, now())
	return err
}

func scanAdminUser(row pgx.Row) (domain.AdminUserSummary, error) {
	var user domain.AdminUserSummary
	var role string
	var language *string

	err := row.Scan(
		&user.ID, &user.Name, &user.Email, &user.PhotoURL, &role, &user.Active, &language, &user.CreatedAt,
		&user.EstablishmentCount,
	)

	user.Role = domain.Role(role)
	user.Language = domain.DefaultLanguage
	if language != nil {
		user.Language = *language
	}

	return user, err
}
