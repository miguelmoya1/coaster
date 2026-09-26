package repository

import (
	"context"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

func TestMigrationsAreApplied(t *testing.T) {
	var exists bool
	err := testPool.QueryRow(context.Background(), `SELECT to_regclass('"User"') IS NOT NULL`).Scan(&exists)
	if err != nil {
		t.Fatal(err)
	}

	if !exists {
		t.Error(`table "User" does not exist after applying the migrations`)
	}
}

func TestResetDBEmptiesTheTables(t *testing.T) {
	ctx := context.Background()

	_, err := testPool.Exec(ctx, `INSERT INTO "BetaTester" (id, email, "createdAt") VALUES ('b1', 'a@example.com', now())`)
	if err != nil {
		t.Fatal(err)
	}

	resetDB(t)

	var count int
	if err := testPool.QueryRow(ctx, `SELECT count(*) FROM "BetaTester"`).Scan(&count); err != nil {
		t.Fatal(err)
	}

	if count != 0 {
		t.Errorf("BetaTester has %d rows after resetDB, want 0", count)
	}
}

func TestDomainTimeReadsAndWritesTimestamps(t *testing.T) {
	want := domain.NewTime(time.Date(2026, 9, 27, 10, 0, 0, 120_000_000, time.UTC))

	var got domain.Time
	err := testPool.QueryRow(context.Background(), `SELECT $1::timestamp(3)`, want).Scan(&got)
	if err != nil {
		t.Fatal(err)
	}

	if !got.Equal(want.Time) {
		t.Errorf("got %v, want %v", got, want)
	}
}
