package domain

import "time"

// DailyRevenue is DailyRevenue in @coaster/common: one day of the current week.
type DailyRevenue struct {
	DayName string `json:"dayName"`
	Amount  int    `json:"amount"`
	DateStr string `json:"dateStr"`
}

// MonthlyRevenue is MonthlyRevenue in @coaster/common: one month of the current year.
type MonthlyRevenue struct {
	MonthIndex int    `json:"monthIndex"`
	MonthName  string `json:"monthName"`
	Amount     int    `json:"amount"`
}

// EstablishmentStatsHistory is EstablishmentStatsHistory in @coaster/common: the month and
// year figures, only for those who may see the history.
type EstablishmentStatsHistory struct {
	CurrentMonthRevenue  int              `json:"currentMonthRevenue"`
	PreviousMonthRevenue int              `json:"previousMonthRevenue"`
	YearlyRevenue        int              `json:"yearlyRevenue"`
	MonthlyBreakdown     []MonthlyRevenue `json:"monthlyBreakdown"`
	PercentageChange     int              `json:"percentageChange"`
	IsPositiveChange     bool             `json:"isPositiveChange"`
	MaxMonthRevenue      int              `json:"maxMonthRevenue"`
}

// EstablishmentStats is EstablishmentStats in @coaster/common. Amounts are in cents and
// History is nil without the history permission.
type EstablishmentStats struct {
	TodayRevenue               int                        `json:"todayRevenue"`
	YesterdayRevenue           int                        `json:"yesterdayRevenue"`
	SameWeekdayLastWeekRevenue int                        `json:"sameWeekdayLastWeekRevenue"`
	WeeklyRevenue              int                        `json:"weeklyRevenue"`
	DailyRevenues              []DailyRevenue             `json:"dailyRevenues"`
	TodayTicketCount           int                        `json:"todayTicketCount"`
	TodayAverageTicket         int                        `json:"todayAverageTicket"`
	TodayCashRevenue           int                        `json:"todayCashRevenue"`
	TodayCardRevenue           int                        `json:"todayCardRevenue"`
	TodayTipAmount             int                        `json:"todayTipAmount"`
	History                    *EstablishmentStatsHistory `json:"history"`
}

// StatsOrder is a closed order as the stats count it.
type StatsOrder struct {
	AmountPaidCash int
	AmountPaidCard int
	TipAmount      int
	CreatedAt      time.Time
}

// statsDayNames are the days of the week from Monday, as Nest writes them.
var statsDayNames = []string{"Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"}

// statsMonthNames are the months as toLocaleDateString('es-ES', { month: 'short' }) writes
// them in Node, without the dot and with a capital letter.
var statsMonthNames = []string{"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sept", "Oct", "Nov", "Dic"}

// statsDateLayout is how a day is written: "2026-06-17".
const statsDateLayout = "2006-01-02"

// startOfStatsWeek is midnight of the Monday of now's week.
func startOfStatsWeek(now time.Time) time.Time {
	daysSinceMonday := (int(now.Weekday()) + 6) % 7
	return time.Date(now.Year(), now.Month(), now.Day()-daysSinceMonday, 0, 0, 0, 0, now.Location())
}

// StatsSince is the first instant of the orders the stats read: the start of last year with
// the history, and the Monday of last week without it. The days are those of now's zone.
func StatsSince(now time.Time, includeHistory bool) time.Time {
	if includeHistory {
		return time.Date(now.Year()-1, time.January, 1, 0, 0, 0, 0, now.Location())
	}

	startOfWeek := startOfStatsWeek(now)
	return time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day()-7, 0, 0, 0, 0, now.Location())
}

// EstablishmentStatsOf is GetEstablishmentStatsHandler: it adds up the closed orders by day,
// week and month. The revenue of an order is what was charged minus the tip, and its day is
// the day it was created on. The days are those of now's zone.
func EstablishmentStatsOf(orders []StatsOrder, now time.Time, includeHistory bool) EstablishmentStats {
	location := now.Location()
	startOfWeek := startOfStatsWeek(now)

	today := now.Format(statsDateLayout)
	yesterday := now.AddDate(0, 0, -1).Format(statsDateLayout)
	sameWeekdayLastWeek := now.AddDate(0, 0, -7).Format(statsDateLayout)

	stats := EstablishmentStats{DailyRevenues: make([]DailyRevenue, len(statsDayNames))}
	for i, name := range statsDayNames {
		stats.DailyRevenues[i] = DailyRevenue{DayName: name, DateStr: startOfWeek.AddDate(0, 0, i).Format(statsDateLayout)}
	}

	history := EstablishmentStatsHistory{MonthlyBreakdown: make([]MonthlyRevenue, len(statsMonthNames))}
	for i, name := range statsMonthNames {
		history.MonthlyBreakdown[i] = MonthlyRevenue{MonthIndex: i, MonthName: name}
	}

	previousMonth := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, location)

	for _, order := range orders {
		revenue := order.AmountPaidCash + order.AmountPaidCard - order.TipAmount
		createdAt := order.CreatedAt.In(location)
		day := createdAt.Format(statsDateLayout)

		if day == today {
			stats.TodayRevenue += revenue
			stats.TodayTicketCount++
			stats.TodayCashRevenue += order.AmountPaidCash
			stats.TodayCardRevenue += order.AmountPaidCard
			stats.TodayTipAmount += order.TipAmount
		}
		if day == yesterday {
			stats.YesterdayRevenue += revenue
		}
		if day == sameWeekdayLastWeek {
			stats.SameWeekdayLastWeekRevenue += revenue
		}
		if !createdAt.Before(startOfWeek) {
			stats.WeeklyRevenue += revenue
		}

		for i := range stats.DailyRevenues {
			if stats.DailyRevenues[i].DateStr == day {
				stats.DailyRevenues[i].Amount += revenue
				break
			}
		}

		if createdAt.Year() == now.Year() {
			history.YearlyRevenue += revenue
			history.MonthlyBreakdown[createdAt.Month()-1].Amount += revenue

			if createdAt.Month() == now.Month() {
				history.CurrentMonthRevenue += revenue
			}
		}
		if createdAt.Year() == previousMonth.Year() && createdAt.Month() == previousMonth.Month() {
			history.PreviousMonthRevenue += revenue
		}
	}

	if stats.TodayTicketCount > 0 {
		stats.TodayAverageTicket = roundJS(float64(stats.TodayRevenue) / float64(stats.TodayTicketCount))
	}

	if !includeHistory {
		return stats
	}

	percentageChange := 0
	history.IsPositiveChange = true
	if history.PreviousMonthRevenue > 0 {
		change := float64(history.CurrentMonthRevenue-history.PreviousMonthRevenue) / float64(history.PreviousMonthRevenue)
		percentageChange = roundJS(change * 100)
		history.IsPositiveChange = history.CurrentMonthRevenue >= history.PreviousMonthRevenue
	} else if history.CurrentMonthRevenue > 0 {
		percentageChange = 100
	}
	if percentageChange < 0 {
		percentageChange = -percentageChange
	}
	history.PercentageChange = percentageChange

	history.MaxMonthRevenue = 1
	for _, month := range history.MonthlyBreakdown {
		history.MaxMonthRevenue = max(history.MaxMonthRevenue, month.Amount)
	}

	stats.History = &history
	return stats
}
