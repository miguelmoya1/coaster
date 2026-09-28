package repository

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"api-go/internal/core/domain"
)

func seedStatsOrders(t *testing.T) {
	t.Helper()
	seedTill(t)

	closed := []tillOrder{
		{id: "today", cash: 1500, tip: 100, createdAt: time.Date(2026, 6, 17, 9, 0, 0, 0, time.UTC)},
		{id: "yesterday", card: 2200, createdAt: time.Date(2026, 6, 16, 20, 0, 0, 0, time.UTC)},
		{id: "last-wednesday", cash: 800, createdAt: time.Date(2026, 6, 10, 13, 0, 0, 0, time.UTC)},
		{id: "last-monday", cash: 50, createdAt: time.Date(2026, 6, 8, 0, 0, 0, 0, time.UTC)},
		{id: "last-sunday", cash: 60, createdAt: time.Date(2026, 6, 7, 23, 59, 59, 999_000_000, time.UTC)},
		{id: "last-month", cash: 3000, createdAt: time.Date(2026, 5, 20, 12, 0, 0, 0, time.UTC)},
		{id: "last-year", card: 4000, createdAt: time.Date(2025, 11, 11, 11, 0, 0, 0, time.UTC)},
		{id: "two-years-ago", cash: 70000, createdAt: time.Date(2024, 12, 31, 23, 59, 59, 999_000_000, time.UTC)},
	}
	for _, order := range closed {
		order.establishmentID = "e1"
		order.status = domain.OrderClosed
		insertTillOrder(t, order)
	}

	today := time.Date(2026, 6, 17, 10, 0, 0, 0, time.UTC)
	insertTillOrder(t, tillOrder{id: "cancelled", establishmentID: "e1", status: domain.OrderCancelled, cash: 999, createdAt: today})
	insertTillOrder(t, tillOrder{id: "open", establishmentID: "e1", status: domain.OrderOpen, cash: 555, createdAt: today})
	insertTillOrder(t, tillOrder{id: "theirs", establishmentID: "e2", status: domain.OrderClosed, cash: 12345, createdAt: today})
}

func TestStatsRepositoryFindClosedOrders(t *testing.T) {
	seedStatsOrders(t)
	insertTillClose(t, "old-close", "e1", "ana", time.Date(2026, 6, 16, 23, 0, 0, 0, time.UTC), 0)
	if _, err := testPool.Exec(context.Background(), `UPDATE "Order" SET "cashCloseId" = 'old-close' WHERE id = 'yesterday'`); err != nil {
		t.Fatal(err)
	}

	orders, err := NewStatsRepository(testPool).FindClosedOrders(context.Background(), "e1", time.Date(2026, 6, 8, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}

	want := []domain.StatsOrder{
		{AmountPaidCash: 50, CreatedAt: time.Date(2026, 6, 8, 0, 0, 0, 0, time.UTC)},
		{AmountPaidCash: 800, CreatedAt: time.Date(2026, 6, 10, 13, 0, 0, 0, time.UTC)},
		{AmountPaidCard: 2200, CreatedAt: time.Date(2026, 6, 16, 20, 0, 0, 0, time.UTC)},
		{AmountPaidCash: 1500, TipAmount: 100, CreatedAt: time.Date(2026, 6, 17, 9, 0, 0, 0, time.UTC)},
	}
	if len(orders) != len(want) {
		t.Fatalf("FindClosedOrders = %+v, want %+v", orders, want)
	}
	for i := range want {
		got := orders[i]
		if got.AmountPaidCash != want[i].AmountPaidCash || got.AmountPaidCard != want[i].AmountPaidCard ||
			got.TipAmount != want[i].TipAmount || !got.CreatedAt.Equal(want[i].CreatedAt) {
			t.Errorf("order %d = %+v, want %+v", i, got, want[i])
		}
	}
}

func TestStatsRepositoryReadsSinceInAnyZone(t *testing.T) {
	seedTill(t)
	insertTillOrder(t, tillOrder{id: "sunday-in-madrid", establishmentID: "e1", status: domain.OrderClosed, cash: 1, createdAt: time.Date(2026, 6, 14, 21, 30, 0, 0, time.UTC)})
	insertTillOrder(t, tillOrder{id: "monday-in-madrid", establishmentID: "e1", status: domain.OrderClosed, cash: 2, createdAt: time.Date(2026, 6, 14, 22, 30, 0, 0, time.UTC)})

	madrid, err := time.LoadLocation("Europe/Madrid")
	if err != nil {
		t.Fatal(err)
	}

	orders, err := NewStatsRepository(testPool).FindClosedOrders(context.Background(), "e1", time.Date(2026, 6, 15, 0, 0, 0, 0, madrid))
	if err != nil {
		t.Fatal(err)
	}
	if len(orders) != 1 || orders[0].AmountPaidCash != 2 {
		t.Errorf("FindClosedOrders = %+v, want only the order of Monday in Madrid", orders)
	}
}

func TestStatsFromTheDatabaseMatchNest(t *testing.T) {
	seedStatsOrders(t)
	now := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)

	week := `[{"dayName":"Lun","amount":0,"dateStr":"2026-06-15"},{"dayName":"Mar","amount":2200,"dateStr":"2026-06-16"},{"dayName":"Mié","amount":1400,"dateStr":"2026-06-17"},{"dayName":"Jue","amount":0,"dateStr":"2026-06-18"},{"dayName":"Vie","amount":0,"dateStr":"2026-06-19"},{"dayName":"Sáb","amount":0,"dateStr":"2026-06-20"},{"dayName":"Dom","amount":0,"dateStr":"2026-06-21"}]`
	today := `"todayTicketCount":1,"todayAverageTicket":1400,"todayCashRevenue":1500,"todayCardRevenue":0,"todayTipAmount":100`

	tests := []struct {
		includeHistory bool
		want           string
	}{
		{
			includeHistory: true,
			want:           `{"todayRevenue":1400,"yesterdayRevenue":2200,"sameWeekdayLastWeekRevenue":800,"weeklyRevenue":3600,"dailyRevenues":` + week + `,` + today + `,"history":{"currentMonthRevenue":4510,"previousMonthRevenue":3000,"yearlyRevenue":7510,"monthlyBreakdown":[{"monthIndex":0,"monthName":"Ene","amount":0},{"monthIndex":1,"monthName":"Feb","amount":0},{"monthIndex":2,"monthName":"Mar","amount":0},{"monthIndex":3,"monthName":"Abr","amount":0},{"monthIndex":4,"monthName":"May","amount":3000},{"monthIndex":5,"monthName":"Jun","amount":4510},{"monthIndex":6,"monthName":"Jul","amount":0},{"monthIndex":7,"monthName":"Ago","amount":0},{"monthIndex":8,"monthName":"Sept","amount":0},{"monthIndex":9,"monthName":"Oct","amount":0},{"monthIndex":10,"monthName":"Nov","amount":0},{"monthIndex":11,"monthName":"Dic","amount":0}],"percentageChange":50,"isPositiveChange":true,"maxMonthRevenue":4510}}`,
		},
		{
			includeHistory: false,
			want:           `{"todayRevenue":1400,"yesterdayRevenue":2200,"sameWeekdayLastWeekRevenue":800,"weeklyRevenue":3600,"dailyRevenues":` + week + `,` + today + `,"history":null}`,
		},
	}

	for _, tt := range tests {
		orders, err := NewStatsRepository(testPool).FindClosedOrders(context.Background(), "e1", domain.StatsSince(now, tt.includeHistory))
		if err != nil {
			t.Fatal(err)
		}

		got, err := json.Marshal(domain.EstablishmentStatsOf(orders, now, tt.includeHistory))
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != tt.want {
			t.Errorf("history %v: stats =\n%s\nwant\n%s", tt.includeHistory, got, tt.want)
		}
	}
}
