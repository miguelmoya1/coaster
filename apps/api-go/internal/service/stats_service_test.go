package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

// The cases of get-establishment-stats.handler.spec.ts, on Wednesday 17 June 2026 at noon UTC.

var (
	statsNow       = time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	statsToday     = time.Date(2026, 6, 17, 10, 0, 0, 0, time.UTC)
	statsYesterday = time.Date(2026, 6, 16, 15, 0, 0, 0, time.UTC)
)

func newStatsFixture(orders ...domain.StatsOrder) (*StatsService, *fakeStatsRepository) {
	repo := &fakeStatsRepository{orders: orders}
	service := NewStatsService(repo)
	service.now = func() time.Time { return statsNow }
	return service, repo
}

func statsClosedOrder(cash, card, tip int, createdAt time.Time) domain.StatsOrder {
	return domain.StatsOrder{AmountPaidCash: cash, AmountPaidCard: card, TipAmount: tip, CreatedAt: createdAt}
}

func TestStatsWithoutClosedOrders(t *testing.T) {
	service, repo := newStatsFixture()

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
	if err != nil {
		t.Fatal(err)
	}

	if repo.establishmentID != "establishment-1" {
		t.Errorf("read establishment %q", repo.establishmentID)
	}
	if stats.TodayRevenue != 0 || stats.YesterdayRevenue != 0 || stats.WeeklyRevenue != 0 || stats.TodayTicketCount != 0 || stats.TodayAverageTicket != 0 {
		t.Errorf("stats = %+v, want zeros", stats)
	}
	history := stats.History
	if history == nil || history.CurrentMonthRevenue != 0 || history.PreviousMonthRevenue != 0 || history.YearlyRevenue != 0 ||
		history.PercentageChange != 0 || !history.IsPositiveChange || history.MaxMonthRevenue != 1 {
		t.Errorf("history = %+v", history)
	}
	if len(stats.DailyRevenues) != 7 {
		t.Errorf("%d daily revenues, want 7", len(stats.DailyRevenues))
	}
}

func TestStatsCountTheDaysOfTheEstablishment(t *testing.T) {
	service, _ := newStatsFixture(
		statsClosedOrder(100, 0, 0, time.Date(2026, 6, 16, 22, 30, 0, 0, time.UTC)),
		statsClosedOrder(40, 0, 0, time.Date(2026, 6, 16, 21, 30, 0, 0, time.UTC)),
		statsClosedOrder(7, 0, 0, time.Date(2026, 5, 31, 22, 30, 0, 0, time.UTC)),
	)

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
	if err != nil {
		t.Fatal(err)
	}

	if stats.TodayRevenue != 100 || stats.YesterdayRevenue != 40 {
		t.Errorf("today %d, yesterday %d; want 100 and 40: 00:30 in Madrid is already today", stats.TodayRevenue, stats.YesterdayRevenue)
	}
	if stats.History.CurrentMonthRevenue != 147 || stats.History.PreviousMonthRevenue != 0 {
		t.Errorf("this month %d, last month %d; want 147 and 0", stats.History.CurrentMonthRevenue, stats.History.PreviousMonthRevenue)
	}
}

func TestStatsAggregateRevenuesAndTrends(t *testing.T) {
	service, _ := newStatsFixture(
		statsClosedOrder(100, 0, 0, statsToday),
		statsClosedOrder(0, 50, 0, statsYesterday),
		statsClosedOrder(200, 0, 0, time.Date(2026, 5, 15, 12, 0, 0, 0, time.UTC)),
	)

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
	if err != nil {
		t.Fatal(err)
	}

	if stats.TodayRevenue != 100 || stats.YesterdayRevenue != 50 || stats.WeeklyRevenue != 150 {
		t.Errorf("today %d, yesterday %d, week %d; want 100, 50, 150", stats.TodayRevenue, stats.YesterdayRevenue, stats.WeeklyRevenue)
	}
	history := stats.History
	if history.CurrentMonthRevenue != 150 || history.PreviousMonthRevenue != 200 || history.PercentageChange != 25 || history.IsPositiveChange {
		t.Errorf("history = %+v, want 150 against 200, 25 %% down", history)
	}
}

func TestStatsCountWhatWasTaken(t *testing.T) {
	tests := []struct {
		name                     string
		order                    domain.StatsOrder
		revenue, cash, card, tip int
	}{
		{name: "after the discount, not the menu price", order: statsClosedOrder(900, 0, 0, statsToday), revenue: 900, cash: 900},
		{name: "without the tip, split by how it was paid", order: statsClosedOrder(1000, 200, 200, statsToday), revenue: 1000, cash: 1000, card: 200, tip: 200},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, _ := newStatsFixture(tt.order)

			stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
			if err != nil {
				t.Fatal(err)
			}

			if stats.TodayRevenue != tt.revenue || stats.WeeklyRevenue != tt.revenue {
				t.Errorf("today %d, week %d; want %d", stats.TodayRevenue, stats.WeeklyRevenue, tt.revenue)
			}
			if stats.TodayCashRevenue != tt.cash || stats.TodayCardRevenue != tt.card || stats.TodayTipAmount != tt.tip {
				t.Errorf("cash %d, card %d, tip %d; want %d, %d, %d", stats.TodayCashRevenue, stats.TodayCardRevenue, stats.TodayTipAmount, tt.cash, tt.card, tt.tip)
			}
		})
	}
}

func TestStatsAverageTheTicketOverTodayOnly(t *testing.T) {
	service, _ := newStatsFixture(
		statsClosedOrder(300, 0, 0, statsToday),
		statsClosedOrder(200, 0, 0, statsToday),
		statsClosedOrder(9999, 0, 0, statsYesterday),
	)

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
	if err != nil {
		t.Fatal(err)
	}

	if stats.TodayTicketCount != 2 || stats.TodayAverageTicket != 250 {
		t.Errorf("tickets %d, average %d; want 2 and 250", stats.TodayTicketCount, stats.TodayAverageTicket)
	}
}

func TestStatsCompareTodayWithTheSameWeekdayOfLastWeek(t *testing.T) {
	service, _ := newStatsFixture(
		statsClosedOrder(500, 0, 0, statsToday),
		statsClosedOrder(400, 0, 0, time.Date(2026, 6, 10, 10, 0, 0, 0, time.UTC)),
	)

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
	if err != nil {
		t.Fatal(err)
	}

	if stats.TodayRevenue != 500 || stats.SameWeekdayLastWeekRevenue != 400 {
		t.Errorf("today %d, same weekday last week %d; want 500 and 400", stats.TodayRevenue, stats.SameWeekdayLastWeekRevenue)
	}
}

func TestStatsWithholdTheHistory(t *testing.T) {
	service, repo := newStatsFixture(statsClosedOrder(500, 0, 0, statsToday))

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", false)
	if err != nil {
		t.Fatal(err)
	}

	if stats.History != nil || stats.TodayRevenue != 500 || stats.WeeklyRevenue != 500 {
		t.Errorf("stats = %+v, want today and the week without history", stats)
	}

	twoWeeksAgo := time.Date(2026, 6, 3, 0, 0, 0, 0, time.UTC)
	if !repo.since.After(twoWeeksAgo) {
		t.Errorf("read orders since %s, want less than two weeks", repo.since)
	}
}

func TestStatsReadTheYearBeforeWithTheHistory(t *testing.T) {
	service, repo := newStatsFixture()

	if _, err := service.EstablishmentStats(context.Background(), "establishment-1", true); err != nil {
		t.Fatal(err)
	}

	if want := time.Date(2024, 12, 31, 23, 0, 0, 0, time.UTC); !repo.since.Equal(want) {
		t.Errorf("read orders since %s, want %s", repo.since, want)
	}
}

func TestStatsFullMonthOnTheRise(t *testing.T) {
	service, _ := newStatsFixture(statsClosedOrder(150, 0, 0, statsToday))

	stats, err := service.EstablishmentStats(context.Background(), "establishment-1", true)
	if err != nil {
		t.Fatal(err)
	}

	history := stats.History
	if history.CurrentMonthRevenue != 150 || history.PreviousMonthRevenue != 0 || history.PercentageChange != 100 || !history.IsPositiveChange {
		t.Errorf("history = %+v, want 150 against nothing, 100 %% up", history)
	}
}

func TestStatsFailWithTheRepository(t *testing.T) {
	service, repo := newStatsFixture()
	repo.err = errors.New("database down")

	if _, err := service.EstablishmentStats(context.Background(), "establishment-1", true); !errors.Is(err, repo.err) {
		t.Errorf("err = %v, want %v", err, repo.err)
	}
}
