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
	//go:embed queries/ai_usage/count_message.sql
	countAIMessageQuery string
)

// AIUsageRepository counts the assistant messages in "AiUsage", one row per establishment
// and month.
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

// CountMessage creates the month's row with one message, or adds one to it, in a single
// statement: two messages at once both count.
func (r *AIUsageRepository) CountMessage(ctx context.Context, establishmentID, period string) (int, error) {
	var messages int
	err := r.pool.QueryRow(ctx, countAIMessageQuery, uuid.NewV4().String(), establishmentID, period, now()).Scan(&messages)
	return messages, err
}
