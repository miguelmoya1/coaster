package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/shift/list_by_establishment.sql
	listShiftsByEstablishmentQuery string
	//go:embed queries/shift/find_by_id.sql
	findShiftByIDQuery string
	//go:embed queries/shift/insert.sql
	insertShiftQuery string
	//go:embed queries/shift/delete.sql
	deleteShiftQuery string
)

type ShiftRepository struct {
	pool *pgxpool.Pool
}

func NewShiftRepository(pool *pgxpool.Pool) *ShiftRepository {
	return &ShiftRepository{pool: pool}
}

func scanShift(row pgx.Row) (domain.Shift, error) {
	var shift domain.Shift
	var start, end time.Time

	err := row.Scan(&shift.ID, &start, &end, &shift.UserID, &shift.UserName, &shift.UserImage, &shift.EstablishmentID, &shift.Notes)
	shift.StartTime = domain.NewInstant(start)
	shift.EndTime = domain.NewInstant(end)

	return shift, err
}

func (r *ShiftRepository) ListByEstablishment(ctx context.Context, establishmentID string, from, to *time.Time) ([]domain.Shift, error) {
	rows, err := r.pool.Query(ctx, listShiftsByEstablishmentQuery, establishmentID, utcOrNil(from), utcOrNil(to))
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Shift, error) {
		return scanShift(row)
	})
}

func (r *ShiftRepository) FindByID(ctx context.Context, id string) (*domain.Shift, error) {
	shift, err := scanShift(r.pool.QueryRow(ctx, findShiftByIDQuery, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &shift, nil
}

func (r *ShiftRepository) Create(ctx context.Context, input domain.NewShift) (*domain.Shift, error) {
	id := uuid.NewV4().String()

	_, err := r.pool.Exec(ctx, insertShiftQuery,
		id, input.StartTime.UTC(), input.EndTime.UTC(), input.UserID, input.EstablishmentID, input.Notes, now(),
	)
	if err != nil {
		return nil, err
	}

	return r.FindByID(ctx, id)
}

func (r *ShiftRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, deleteShiftQuery, id)
	return err
}
