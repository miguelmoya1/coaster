package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Helpers every repository can use.

// querier is what the pool and a transaction have in common, so a helper can run a query
// in either.
type querier interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// now is the time to write: Prisma stores timestamps in UTC, in columns without a time zone.
func now() time.Time {
	return time.Now().UTC()
}

// utcOrNil turns an optional time into UTC for a column without a time zone.
func utcOrNil(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	utc := t.UTC()
	return &utc
}

// nullIfEmpty stores "" as NULL.
func nullIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
