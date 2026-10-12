package repository

import (
	"context"
	_ "embed"
	"errors"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	//go:embed queries/ai_usage/messages_this_period.sql
	messagesThisPeriodQuery string
	//go:embed queries/ai_usage/reserve_message.sql
	reserveAIMessageQuery string
	//go:embed queries/ai_usage/release_message.sql
	releaseAIMessageQuery string
)

type AIUsageRepository struct {
	pool *pgxpool.Pool
}

func NewAIUsageRepository(pool *pgxpool.Pool) *AIUsageRepository {
	return &AIUsageRepository{pool: pool}
}

func (r *AIUsageRepository) MessagesThisPeriod(ctx context.Context, establishmentID, period string) (int, error) {
	var messages int
	err := r.pool.QueryRow(ctx, messagesThisPeriodQuery, establishmentID, period).Scan(&messages)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return messages, err
}

func (r *AIUsageRepository) ReserveMessage(ctx context.Context, establishmentID, period string, allowance int) (bool, error) {
	if allowance <= 0 {
		return false, nil
	}

	var messages int
	err := r.pool.QueryRow(ctx, reserveAIMessageQuery, uuid.NewV4().String(), establishmentID, period, allowance, now()).Scan(&messages)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *AIUsageRepository) ReleaseMessage(ctx context.Context, establishmentID, period string) error {
	_, err := r.pool.Exec(ctx, releaseAIMessageQuery, establishmentID, period, now())
	return err
}
