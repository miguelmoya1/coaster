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
	//go:embed queries/shift_exchange/find_by_id.sql
	findShiftExchangeByIDQuery string
	//go:embed queries/shift_exchange/has_pending.sql
	hasPendingShiftExchangeQuery string
	//go:embed queries/shift_exchange/list_pending.sql
	listPendingShiftExchangesQuery string
	//go:embed queries/shift_exchange/insert.sql
	insertShiftExchangeQuery string
	//go:embed queries/shift_exchange/claim.sql
	claimShiftExchangeQuery string
	//go:embed queries/shift_exchange/hand_shift_over.sql
	handShiftOverQuery string
	//go:embed queries/shift_exchange/delete.sql
	deleteShiftExchangeQuery string
)

type ShiftExchangeRepository struct {
	pool *pgxpool.Pool
}

func NewShiftExchangeRepository(pool *pgxpool.Pool) *ShiftExchangeRepository {
	return &ShiftExchangeRepository{pool: pool}
}

func (r *ShiftExchangeRepository) FindByID(ctx context.Context, id string) (*domain.ShiftExchangeRecord, error) {
	var exchange domain.ShiftExchangeRecord
	var status string

	err := r.pool.QueryRow(ctx, findShiftExchangeByIDQuery, id).Scan(
		&exchange.ID, &exchange.ShiftID, &exchange.RequesterID, &exchange.TargetID, &status,
		&exchange.ShiftEstablishmentID, &exchange.ShiftStartTime,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	exchange.Status = domain.ShiftExchangeStatus(status)
	return &exchange, nil
}

func (r *ShiftExchangeRepository) HasPending(ctx context.Context, shiftID string) (bool, error) {
	var pending bool
	err := r.pool.QueryRow(ctx, hasPendingShiftExchangeQuery, shiftID).Scan(&pending)
	return pending, err
}

func (r *ShiftExchangeRepository) ListPending(ctx context.Context, establishmentID string, since time.Time) ([]domain.ShiftExchange, error) {
	rows, err := r.pool.Query(ctx, listPendingShiftExchangesQuery, establishmentID, since.UTC())
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.ShiftExchange, error) {
		var exchange domain.ShiftExchange
		var status string
		var start, end, createdAt time.Time

		err := row.Scan(
			&exchange.ID, &exchange.ShiftID, &exchange.RequesterID, &exchange.TargetID, &status,
			&exchange.RequesterName, &start, &end, &createdAt,
		)
		exchange.Status = domain.ShiftExchangeStatus(status)
		exchange.ShiftStartTime = domain.NewInstant(start)
		exchange.ShiftEndTime = domain.NewInstant(end)
		exchange.CreatedAt = domain.NewInstant(createdAt)

		return exchange, err
	})
}

func (r *ShiftExchangeRepository) Create(ctx context.Context, shiftID, requesterID string, targetID *string) error {
	_, err := r.pool.Exec(ctx, insertShiftExchangeQuery, uuid.NewV4().String(), shiftID, requesterID, targetID, now())
	return err
}

func (r *ShiftExchangeRepository) AcceptAndSwap(ctx context.Context, exchangeID, shiftID, userID string) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	claimed, err := tx.Exec(ctx, claimShiftExchangeQuery, exchangeID, userID)
	if err != nil {
		return false, err
	}
	if claimed.RowsAffected() == 0 {
		return false, nil
	}

	if _, err := tx.Exec(ctx, handShiftOverQuery, shiftID, userID, now()); err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	return true, nil
}

func (r *ShiftExchangeRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, deleteShiftExchangeQuery, id)
	return err
}
