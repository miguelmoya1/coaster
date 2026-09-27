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
	//go:embed queries/beta_tester/list.sql
	listBetaTestersQuery string
	//go:embed queries/beta_tester/count.sql
	countBetaTestersQuery string
	//go:embed queries/beta_tester/find_sign_ups.sql
	findBetaSignUpsQuery string
	//go:embed queries/beta_tester/find_by_id.sql
	findBetaTesterByIDQuery string
	//go:embed queries/beta_tester/find_by_email.sql
	findBetaTesterByEmailQuery string
	//go:embed queries/beta_tester/insert.sql
	insertBetaTesterQuery string
	//go:embed queries/beta_tester/delete.sql
	deleteBetaTesterQuery string
)

// BetaTesterRepository keeps the beta allowlist in "BetaTester".
type BetaTesterRepository struct {
	pool *pgxpool.Pool
}

func NewBetaTesterRepository(pool *pgxpool.Pool) *BetaTesterRepository {
	return &BetaTesterRepository{pool: pool}
}

func (r *BetaTesterRepository) List(ctx context.Context, search string, page domain.PageRequest) ([]domain.BetaTester, int, error) {
	rows, err := r.pool.Query(ctx, listBetaTestersQuery, nullIfEmpty(search), page.PageSize, page.Offset())
	if err != nil {
		return nil, 0, err
	}
	testers, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.BetaTester, error) {
		return scanBetaTester(row)
	})
	if err != nil {
		return nil, 0, err
	}

	var total int
	if err := r.pool.QueryRow(ctx, countBetaTestersQuery, nullIfEmpty(search)).Scan(&total); err != nil {
		return nil, 0, err
	}

	return testers, total, nil
}

func (r *BetaTesterRepository) FindSignUps(ctx context.Context, emails []string) ([]domain.BetaSignUp, error) {
	rows, err := r.pool.Query(ctx, findBetaSignUpsQuery, emails)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.BetaSignUp, error) {
		var signUp domain.BetaSignUp
		err := row.Scan(&signUp.UserID, &signUp.Email, &signUp.CreatedAt)
		return signUp, err
	})
}

func (r *BetaTesterRepository) FindByID(ctx context.Context, id string) (*domain.BetaTester, error) {
	return r.findOne(ctx, findBetaTesterByIDQuery, id)
}

func (r *BetaTesterRepository) FindByEmail(ctx context.Context, email string) (*domain.BetaTester, error) {
	return r.findOne(ctx, findBetaTesterByEmailQuery, email)
}

func (r *BetaTesterRepository) findOne(ctx context.Context, query, arg string) (*domain.BetaTester, error) {
	tester, err := scanBetaTester(r.pool.QueryRow(ctx, query, arg))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &tester, nil
}

func (r *BetaTesterRepository) Add(ctx context.Context, email string, note *string, invitedByID string) (string, error) {
	id := uuid.NewV4().String()

	if _, err := r.pool.Exec(ctx, insertBetaTesterQuery, id, email, note, invitedByID, now()); err != nil {
		return "", err
	}
	return id, nil
}

func (r *BetaTesterRepository) Remove(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, deleteBetaTesterQuery, id)
	return err
}

// scanBetaTester reads a row of the tester queries, which all select the same columns.
func scanBetaTester(row pgx.Row) (domain.BetaTester, error) {
	var tester domain.BetaTester
	err := row.Scan(&tester.ID, &tester.Email, &tester.Note, &tester.CreatedAt, &tester.InvitedByName)
	return tester, err
}
