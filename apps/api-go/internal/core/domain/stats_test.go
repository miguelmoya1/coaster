package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func statsUTC(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		panic(err)
	}
	return parsed
}

func statsOrder(cash, card, tip int, createdAt string) StatsOrder {
	return StatsOrder{AmountPaidCash: cash, AmountPaidCard: card, TipAmount: tip, CreatedAt: statsUTC(createdAt)}
}

// statsFixtures are closed orders around the edges of days, weeks, months and years, in
// UTC and in Madrid.
var statsFixtures = []StatsOrder{
	statsOrder(1000, 200, 200, "2026-06-17T10:00:00.000Z"),
	statsOrder(500, 0, 0, "2026-06-17T23:30:00.000Z"),
	statsOrder(0, 750, 0, "2026-06-16T15:00:00.000Z"),
	statsOrder(300, 0, 0, "2026-06-15T00:00:00.000Z"),
	statsOrder(400, 0, 0, "2026-06-14T23:59:59.999Z"),
	statsOrder(900, 0, 0, "2026-06-10T10:00:00.000Z"),
	statsOrder(1234, 0, 0, "2026-05-31T22:30:00.000Z"),
	statsOrder(0, 2000, 100, "2026-05-15T12:00:00.000Z"),
	statsOrder(111, 0, 0, "2026-01-01T00:00:00.000Z"),
	statsOrder(222, 0, 0, "2025-12-31T23:30:00.000Z"),
	statsOrder(333, 0, 0, "2025-12-15T12:00:00.000Z"),
	statsOrder(444, 0, 0, "2025-01-01T00:00:00.000Z"),
	statsOrder(555, 0, 0, "2024-12-31T23:30:00.000Z"),
	statsOrder(50, 0, 0, "2026-06-22T08:00:00.000Z"),
	statsOrder(100, 0, 300, "2026-06-17T11:00:00.000Z"),
	statsOrder(700, 0, 0, "2026-03-29T22:30:00.000Z"),
	statsOrder(0, 800, 0, "2026-03-29T00:30:00.000Z"),
	statsOrder(600, 0, 0, "2026-03-23T12:00:00.000Z"),
	statsOrder(1500, 500, 250, "2026-01-05T09:00:00.000Z"),
	statsOrder(0, 900, 0, "2026-01-04T12:00:00.000Z"),
	statsOrder(50, 0, 0, "2025-12-29T09:00:00.000Z"),
	statsOrder(3, 0, 0, "2026-06-17T12:00:00.001Z"),
}

// statsOrdersSince is what the database gives: the fixtures created at since or later.
func statsOrdersSince(since time.Time) []StatsOrder {
	var found []StatsOrder
	for _, order := range statsFixtures {
		if !order.CreatedAt.Before(since) {
			found = append(found, order)
		}
	}
	return found
}

const statsMonthsOfTheWeekdays = `[{"monthIndex":0,"monthName":"Ene","amount":2761},{"monthIndex":1,"monthName":"Feb","amount":0},{"monthIndex":2,"monthName":"Mar","amount":2100},{"monthIndex":3,"monthName":"Abr","amount":0},{"monthIndex":4,"monthName":"May","amount":3134},{"monthIndex":5,"monthName":"Jun","amount":3703},{"monthIndex":6,"monthName":"Jul","amount":0},{"monthIndex":7,"monthName":"Ago","amount":0},{"monthIndex":8,"monthName":"Sept","amount":0},{"monthIndex":9,"monthName":"Oct","amount":0},{"monthIndex":10,"monthName":"Nov","amount":0},{"monthIndex":11,"monthName":"Dic","amount":0}]`

const statsMonthsInMadrid = `[{"monthIndex":0,"monthName":"Ene","amount":2983},{"monthIndex":1,"monthName":"Feb","amount":0},{"monthIndex":2,"monthName":"Mar","amount":2100},{"monthIndex":3,"monthName":"Abr","amount":0},{"monthIndex":4,"monthName":"May","amount":1900},{"monthIndex":5,"monthName":"Jun","amount":4937},{"monthIndex":6,"monthName":"Jul","amount":0},{"monthIndex":7,"monthName":"Ago","amount":0},{"monthIndex":8,"monthName":"Sept","amount":0},{"monthIndex":9,"monthName":"Oct","amount":0},{"monthIndex":10,"monthName":"Nov","amount":0},{"monthIndex":11,"monthName":"Dic","amount":0}]`

const statsWeekOfJune15 = `[{"dayName":"Lun","amount":300,"dateStr":"2026-06-15"},{"dayName":"Mar","amount":750,"dateStr":"2026-06-16"},{"dayName":"Mié","amount":1303,"dateStr":"2026-06-17"},{"dayName":"Jue","amount":0,"dateStr":"2026-06-18"},{"dayName":"Vie","amount":0,"dateStr":"2026-06-19"},{"dayName":"Sáb","amount":0,"dateStr":"2026-06-20"},{"dayName":"Dom","amount":0,"dateStr":"2026-06-21"}]`

// TestEstablishmentStatsMatchNest compares with what GetEstablishmentStatsHandler answers for
// the same orders, with the clock and the process's zone (TZ) of each case.
func TestEstablishmentStatsMatchNest(t *testing.T) {
	madrid, err := time.LoadLocation("Europe/Madrid")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name           string
		now            time.Time
		includeHistory bool
		since          string
		want           string
	}{
		{
			name: "a Wednesday", now: statsUTC("2026-06-17T12:00:00.000Z"), includeHistory: true,
			since: "2025-01-01T00:00:00.000Z",
			want:  `{"todayRevenue":1303,"yesterdayRevenue":750,"sameWeekdayLastWeekRevenue":900,"weeklyRevenue":2403,"dailyRevenues":` + statsWeekOfJune15 + `,"todayTicketCount":4,"todayAverageTicket":326,"todayCashRevenue":1603,"todayCardRevenue":200,"todayTipAmount":500,"history":{"currentMonthRevenue":3703,"previousMonthRevenue":3134,"yearlyRevenue":11698,"monthlyBreakdown":` + statsMonthsOfTheWeekdays + `,"percentageChange":18,"isPositiveChange":true,"maxMonthRevenue":3703}}`,
		},
		{
			name: "a Wednesday without history", now: statsUTC("2026-06-17T12:00:00.000Z"), includeHistory: false,
			since: "2026-06-08T00:00:00.000Z",
			want:  `{"todayRevenue":1303,"yesterdayRevenue":750,"sameWeekdayLastWeekRevenue":900,"weeklyRevenue":2403,"dailyRevenues":` + statsWeekOfJune15 + `,"todayTicketCount":4,"todayAverageTicket":326,"todayCashRevenue":1603,"todayCardRevenue":200,"todayTipAmount":500,"history":null}`,
		},
		{
			name: "a Sunday night", now: statsUTC("2026-06-21T23:30:00.000Z"), includeHistory: true,
			since: "2025-01-01T00:00:00.000Z",
			want:  `{"todayRevenue":0,"yesterdayRevenue":0,"sameWeekdayLastWeekRevenue":400,"weeklyRevenue":2403,"dailyRevenues":` + statsWeekOfJune15 + `,"todayTicketCount":0,"todayAverageTicket":0,"todayCashRevenue":0,"todayCardRevenue":0,"todayTipAmount":0,"history":{"currentMonthRevenue":3703,"previousMonthRevenue":3134,"yearlyRevenue":11698,"monthlyBreakdown":` + statsMonthsOfTheWeekdays + `,"percentageChange":18,"isPositiveChange":true,"maxMonthRevenue":3703}}`,
		},
		{
			name: "the first Monday of the year", now: statsUTC("2026-01-05T10:00:00.000Z"), includeHistory: true,
			since: "2025-01-01T00:00:00.000Z",
			want:  `{"todayRevenue":1750,"yesterdayRevenue":900,"sameWeekdayLastWeekRevenue":50,"weeklyRevenue":10687,"dailyRevenues":[{"dayName":"Lun","amount":1750,"dateStr":"2026-01-05"},{"dayName":"Mar","amount":0,"dateStr":"2026-01-06"},{"dayName":"Mié","amount":0,"dateStr":"2026-01-07"},{"dayName":"Jue","amount":0,"dateStr":"2026-01-08"},{"dayName":"Vie","amount":0,"dateStr":"2026-01-09"},{"dayName":"Sáb","amount":0,"dateStr":"2026-01-10"},{"dayName":"Dom","amount":0,"dateStr":"2026-01-11"}],"todayTicketCount":1,"todayAverageTicket":1750,"todayCashRevenue":1500,"todayCardRevenue":500,"todayTipAmount":250,"history":{"currentMonthRevenue":2761,"previousMonthRevenue":605,"yearlyRevenue":11698,"monthlyBreakdown":` + statsMonthsOfTheWeekdays + `,"percentageChange":356,"isPositiveChange":true,"maxMonthRevenue":3703}}`,
		},
		{
			name: "past midnight in Madrid", now: statsUTC("2026-06-17T22:30:00.000Z").In(madrid), includeHistory: true,
			since: "2024-12-31T23:00:00.000Z",
			want:  `{"todayRevenue":500,"yesterdayRevenue":803,"sameWeekdayLastWeekRevenue":0,"weeklyRevenue":2803,"dailyRevenues":[{"dayName":"Lun","amount":700,"dateStr":"2026-06-15"},{"dayName":"Mar","amount":750,"dateStr":"2026-06-16"},{"dayName":"Mié","amount":803,"dateStr":"2026-06-17"},{"dayName":"Jue","amount":500,"dateStr":"2026-06-18"},{"dayName":"Vie","amount":0,"dateStr":"2026-06-19"},{"dayName":"Sáb","amount":0,"dateStr":"2026-06-20"},{"dayName":"Dom","amount":0,"dateStr":"2026-06-21"}],"todayTicketCount":1,"todayAverageTicket":500,"todayCashRevenue":500,"todayCardRevenue":0,"todayTipAmount":0,"history":{"currentMonthRevenue":4937,"previousMonthRevenue":1900,"yearlyRevenue":11920,"monthlyBreakdown":` + statsMonthsInMadrid + `,"percentageChange":160,"isPositiveChange":true,"maxMonthRevenue":4937}}`,
		},
		{
			name: "new year in Madrid but not in UTC", now: statsUTC("2025-12-31T23:30:00.000Z").In(madrid), includeHistory: true,
			since: "2024-12-31T23:00:00.000Z",
			want:  `{"todayRevenue":333,"yesterdayRevenue":0,"sameWeekdayLastWeekRevenue":0,"weeklyRevenue":11970,"dailyRevenues":[{"dayName":"Lun","amount":50,"dateStr":"2025-12-29"},{"dayName":"Mar","amount":0,"dateStr":"2025-12-30"},{"dayName":"Mié","amount":0,"dateStr":"2025-12-31"},{"dayName":"Jue","amount":333,"dateStr":"2026-01-01"},{"dayName":"Vie","amount":0,"dateStr":"2026-01-02"},{"dayName":"Sáb","amount":0,"dateStr":"2026-01-03"},{"dayName":"Dom","amount":900,"dateStr":"2026-01-04"}],"todayTicketCount":2,"todayAverageTicket":167,"todayCashRevenue":333,"todayCardRevenue":0,"todayTipAmount":0,"history":{"currentMonthRevenue":2983,"previousMonthRevenue":383,"yearlyRevenue":11920,"monthlyBreakdown":` + statsMonthsInMadrid + `,"percentageChange":679,"isPositiveChange":true,"maxMonthRevenue":4937}}`,
		},
		{
			name: "after the clocks go forward in Madrid", now: statsUTC("2026-03-29T23:00:00.000Z").In(madrid), includeHistory: false,
			since: "2026-03-22T23:00:00.000Z",
			want:  `{"todayRevenue":700,"yesterdayRevenue":800,"sameWeekdayLastWeekRevenue":600,"weeklyRevenue":7537,"dailyRevenues":[{"dayName":"Lun","amount":700,"dateStr":"2026-03-30"},{"dayName":"Mar","amount":0,"dateStr":"2026-03-31"},{"dayName":"Mié","amount":0,"dateStr":"2026-04-01"},{"dayName":"Jue","amount":0,"dateStr":"2026-04-02"},{"dayName":"Vie","amount":0,"dateStr":"2026-04-03"},{"dayName":"Sáb","amount":0,"dateStr":"2026-04-04"},{"dayName":"Dom","amount":0,"dateStr":"2026-04-05"}],"todayTicketCount":1,"todayAverageTicket":700,"todayCashRevenue":700,"todayCardRevenue":0,"todayTipAmount":0,"history":null}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			since := StatsSince(tt.now, tt.includeHistory)
			if !since.Equal(statsUTC(tt.since)) {
				t.Fatalf("since = %s, want %s", since.UTC().Format(time.RFC3339Nano), tt.since)
			}

			stats := EstablishmentStatsOf(statsOrdersSince(since), tt.now, tt.includeHistory)
			got, err := json.Marshal(stats)
			if err != nil {
				t.Fatal(err)
			}
			if string(got) != tt.want {
				t.Errorf("stats =\n%s\nwant\n%s", got, tt.want)
			}
		})
	}
}

func TestEstablishmentStatsWithoutOrders(t *testing.T) {
	stats := EstablishmentStatsOf(nil, statsUTC("2026-06-17T12:00:00Z"), true)

	if stats.TodayRevenue != 0 || stats.TodayAverageTicket != 0 || len(stats.DailyRevenues) != 7 {
		t.Fatalf("stats = %+v", stats)
	}
	history := stats.History
	if history == nil || history.PercentageChange != 0 || !history.IsPositiveChange || history.MaxMonthRevenue != 1 || len(history.MonthlyBreakdown) != 12 {
		t.Fatalf("history = %+v", history)
	}
}

func TestEstablishmentStatsTrend(t *testing.T) {
	now := statsUTC("2026-06-17T12:00:00Z")

	tests := []struct {
		name           string
		current, prior int
		change         int
		positive       bool
	}{
		{name: "down against last month", current: 150, prior: 200, change: 25, positive: false},
		{name: "up against last month", current: 300, prior: 200, change: 50, positive: true},
		{name: "nothing last month", current: 150, prior: 0, change: 100, positive: true},
		{name: "nothing at all", current: 0, prior: 0, change: 0, positive: true},
		{name: "a third down rounds like Math.round", current: 200, prior: 300, change: 33, positive: false},
		{name: "half a percent down rounds towards zero", current: 199, prior: 200, change: 0, positive: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orders := []StatsOrder{
				statsOrder(tt.current, 0, 0, "2026-06-17T10:00:00Z"),
				statsOrder(tt.prior, 0, 0, "2026-05-15T12:00:00Z"),
			}

			history := EstablishmentStatsOf(orders, now, true).History
			if history.PercentageChange != tt.change || history.IsPositiveChange != tt.positive {
				t.Errorf("change = %d, positive = %v; want %d, %v", history.PercentageChange, history.IsPositiveChange, tt.change, tt.positive)
			}
		})
	}
}
