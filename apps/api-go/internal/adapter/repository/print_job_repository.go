package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/print_job/insert.sql
	insertPrintJobQuery string
	//go:embed queries/print_job/find_by_id.sql
	findPrintJobQuery string
	//go:embed queries/print_job/claim.sql
	claimPrintJobQuery string
	//go:embed queries/print_job/complete.sql
	completePrintJobQuery string
	//go:embed queries/print_job/fail.sql
	failPrintJobQuery string
	//go:embed queries/print_job/requeue_stale.sql
	requeueStalePrintJobsQuery string
	//go:embed queries/print_job/fail_stale.sql
	failStalePrintJobsQuery string
)

type PrintJobRepository struct {
	pool *pgxpool.Pool
}

func NewPrintJobRepository(pool *pgxpool.Pool) *PrintJobRepository {
	return &PrintJobRepository{pool: pool}
}

func (r *PrintJobRepository) Enqueue(ctx context.Context, establishmentID string, ticket domain.PrintTicket) (string, error) {
	id := uuid.NewV4().String()

	if _, err := r.pool.Exec(ctx, insertPrintJobQuery, id, establishmentID, ticket); err != nil {
		return "", err
	}
	return id, nil
}

func (r *PrintJobRepository) FindByID(ctx context.Context, id string) (*domain.PrintJob, error) {
	var job domain.PrintJob
	err := r.pool.QueryRow(ctx, findPrintJobQuery, id).Scan(
		&job.ID, &job.EstablishmentID, &job.Status, &job.Error, &job.CreatedAt, &job.CompletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *PrintJobRepository) ClaimNext(ctx context.Context, establishmentID string, claimedAt time.Time) (*domain.ClaimedPrintJob, error) {
	var job domain.ClaimedPrintJob
	err := r.pool.QueryRow(ctx, claimPrintJobQuery, establishmentID, claimedAt.UTC()).Scan(&job.ID, &job.Payload)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &job, nil
}

func (r *PrintJobRepository) Complete(ctx context.Context, id string, completedAt time.Time) error {
	_, err := r.pool.Exec(ctx, completePrintJobQuery, id, completedAt.UTC())
	return err
}

func (r *PrintJobRepository) Fail(ctx context.Context, id, reason string, completedAt time.Time) error {
	_, err := r.pool.Exec(ctx, failPrintJobQuery, id, truncate(reason, domain.MaxPrintErrorLength), completedAt.UTC())
	return err
}

func (r *PrintJobRepository) RequeueStale(ctx context.Context, establishmentID string, claimedBefore, now time.Time) error {
	_, err := r.pool.Exec(ctx, requeueStalePrintJobsQuery, establishmentID, claimedBefore.UTC(), domain.MaxPrintAttempts)
	if err != nil {
		return err
	}

	_, err = r.pool.Exec(ctx, failStalePrintJobsQuery,
		establishmentID, claimedBefore.UTC(), domain.MaxPrintAttempts, now.UTC(), domain.PrintJobAbandonedError,
	)
	return err
}
