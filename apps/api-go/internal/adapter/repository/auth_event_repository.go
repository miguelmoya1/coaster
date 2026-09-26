package repository

import (
	"context"
	_ "embed"
	"strings"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/auth_event/insert.sql
	insertAuthEventQuery string
	//go:embed queries/auth_event/find_recent_of.sql
	findRecentAuthEventsQuery string
)

// userAgentMaxLength keeps a browser that sends a huge user agent from filling the table.
const userAgentMaxLength = 512

// AuthEventRepository writes the auth log in "AuthEvent".
type AuthEventRepository struct {
	pool *pgxpool.Pool
}

func NewAuthEventRepository(pool *pgxpool.Pool) *AuthEventRepository {
	return &AuthEventRepository{pool: pool}
}

// Record stores the event. The address is stored trimmed and lowercased, like the accounts
// table does, and empty values as NULL.
func (r *AuthEventRepository) Record(ctx context.Context, event domain.AuthEventOccurred) error {
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

// FindRecentOf lists a user's latest events, newest first.
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

// truncate keeps the first max characters of value.
func truncate(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}
