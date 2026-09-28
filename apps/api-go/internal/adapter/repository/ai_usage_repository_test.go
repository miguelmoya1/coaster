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

	for range 3 {
		if reserved, err := repo.ReserveMessage(ctx, "e1", "2026-09", 500); err != nil || !reserved {
			t.Fatalf("ReserveMessage = %v, %v; want it reserved", reserved, err)
		}
	}
	if _, err := repo.ReserveMessage(ctx, "e1", "2026-10", 500); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.ReserveMessage(ctx, "e2", "2026-09", 500); err != nil {
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
	var mu sync.Mutex
	reserved := 0
	for range 10 {
		wg.Go(func() {
			ok, err := repo.ReserveMessage(ctx, "e1", "2026-09", 4)
			if err != nil {
				t.Error(err)
			}
			if ok {
				mu.Lock()
				reserved++
				mu.Unlock()
			}
		})
	}
	wg.Wait()

	messages, err := repo.MessagesThisPeriod(ctx, "e1", "2026-09")
	if err != nil || messages != 4 || reserved != 4 {
		t.Errorf("after 10 at once with room for 4: %d messages, %d reserved, %v; want 4 and 4", messages, reserved, err)
	}
}

func TestAIUsageRepositoryReleasesAMessage(t *testing.T) {
	seedAIUsage(t)
	ctx := context.Background()
	repo := NewAIUsageRepository(testPool)

	if reserved, err := repo.ReserveMessage(ctx, "e1", "2026-09", 0); err != nil || reserved {
		t.Fatalf("ReserveMessage with the assistant switched off = %v, %v", reserved, err)
	}
	if reserved, err := repo.ReserveMessage(ctx, "e1", "2026-09", 1); err != nil || !reserved {
		t.Fatalf("ReserveMessage = %v, %v", reserved, err)
	}
	if reserved, _ := repo.ReserveMessage(ctx, "e1", "2026-09", 1); reserved {
		t.Fatal("reserved a message over the allowance")
	}

	if err := repo.ReleaseMessage(ctx, "e1", "2026-09"); err != nil {
		t.Fatal(err)
	}
	if err := repo.ReleaseMessage(ctx, "e1", "2026-09"); err != nil {
		t.Fatal(err)
	}
	if messages, err := repo.MessagesThisPeriod(ctx, "e1", "2026-09"); err != nil || messages != 0 {
		t.Errorf("after releasing = %d, %v; want 0 and never below", messages, err)
	}
	if reserved, _ := repo.ReserveMessage(ctx, "e1", "2026-09", 1); !reserved {
		t.Error("a released message should leave room for another")
	}
}
