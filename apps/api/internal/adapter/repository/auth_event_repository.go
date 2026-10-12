package repository

import (
	"context"
	_ "embed"
	"strings"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"coaster-api/internal/core/domain"
)

var (
	//go:embed queries/auth_event/insert.sql
	insertAuthEventQuery string
	//go:embed queries/auth_event/find_recent_of.sql
	findRecentAuthEventsQuery string
)

const userAgentMaxLength = 512

type AuthEventRepository struct {
	pool *pgxpool.Pool
}

func NewAuthEventRepository(pool *pgxpool.Pool) *AuthEventRepository {
	return &AuthEventRepository{pool: pool}
}

func (r *AuthEventRepository) Record(ctx context.Context, event domain.AuthEvent) error {
	var metadata any
	if len(event.Metadata) > 0 {
		metadata = event.Metadata
	}

	_, err := r.pool.Exec(ctx, insertAuthEventQuery,
		uuid.NewV4().String(),
		string(event.Type),
		nullIfEmpty(event.UserID),
		nullIfEmpty(strings.ToLower(strings.TrimSpace(event.Email))),
		nullIfEmpty(event.SessionID),
		nullIfEmpty(event.Origin.IP),
		nullIfEmpty(truncate(event.Origin.UserAgent, userAgentMaxLength)),
		metadata,
		now(),
	)
	return err
}

func (r *AuthEventRepository) FindRecentOf(ctx context.Context, userID string, limit int) ([]domain.AuthEventRecord, error) {
	rows, err := r.pool.Query(ctx, findRecentAuthEventsQuery, userID, limit)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AuthEventRecord, error) {
		var record domain.AuthEventRecord
		var eventType string
		var createdAt time.Time

		err := row.Scan(
			&record.ID, &eventType, &record.UserID, &record.Email, &record.SessionID,
			&record.IP, &record.UserAgent, &record.Metadata, &createdAt,
		)
		record.Type = domain.AuthEventType(eventType)
		record.CreatedAt = domain.NewTime(createdAt)

		return record, err
	})
}

func truncate(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}
