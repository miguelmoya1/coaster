package repository

import (
	"context"
	"sync"
	"testing"
)

// seedAIUsage creates the establishments e1 and e2.
func seedAIUsage(t *testing.T) {
	t.Helper()
	resetDB(t)

	_, err := testPool.Exec(context.Background(),
		`INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ('e1', 'Bar Pepe', now()), ('e2', 'Otro', now())`)
	if err != nil {
		t.Fatalf("seeding: %v", err)
	}
}

func TestAIUsageRepositoryStartsAtZero(t *testing.T) {
	seedAIUsage(t)

	messages, err := NewAIUsageRepository(testPool).MessagesThisPeriod(context.Background(), "e1", "2026-09")
	if err != nil || messages != 0 {
		t.Errorf("MessagesThisPeriod without a row = %d, %v; want 0", messages, err)
	}
}

func TestAIUsageRepositoryCountsPerEstablishmentAndMonth(t *testing.T) {
	seedAIUsage(t)
	ctx := context.Background()
	repo := NewAIUsageRepository(testPool)

	for want := 1; want <= 3; want++ {
		messages, err := repo.CountMessage(ctx, "e1", "2026-09")
		if err != nil || messages != want {
			t.Fatalf("CountMessage = %d, %v; want %d", messages, err, want)
		}
	}
	if _, err := repo.CountMessage(ctx, "e1", "2026-10"); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.CountMessage(ctx, "e2", "2026-09"); err != nil {
		t.Fatal(err)
	}

	for _, check := range []struct {
		establishmentID, period string
		want                    int
	}{
		{"e1", "2026-09", 3},
		{"e1", "2026-10", 1},
		{"e2", "2026-09", 1},
		{"e2", "2026-10", 0},
	} {
		messages, err := repo.MessagesThisPeriod(ctx, check.establishmentID, check.period)
		if err != nil || messages != check.want {
			t.Errorf("MessagesThisPeriod(%s, %s) = %d, %v; want %d", check.establishmentID, check.period, messages, err, check.want)
		}
	}

	var rows int
	if err := testPool.QueryRow(ctx, `SELECT count(*) FROM "AiUsage" WHERE "createdAt" IS NOT NULL AND "updatedAt" IS NOT NULL`).Scan(&rows); err != nil {
		t.Fatal(err)
	}
	if rows != 3 {
		t.Errorf("rows = %d, want one per establishment and month (3)", rows)
	}
}

func TestAIUsageRepositoryCountsMessagesSentAtOnce(t *testing.T) {
	seedAIUsage(t)
	ctx := context.Background()
	repo := NewAIUsageRepository(testPool)

	var wg sync.WaitGroup
	for range 10 {
		wg.Go(func() {
			if _, err := repo.CountMessage(ctx, "e1", "2026-09"); err != nil {
				t.Error(err)
			}
		})
	}
	wg.Wait()

	messages, err := repo.MessagesThisPeriod(ctx, "e1", "2026-09")
	if err != nil || messages != 10 {
		t.Errorf("MessagesThisPeriod after 10 at once = %d, %v; want 10", messages, err)
	}
}
