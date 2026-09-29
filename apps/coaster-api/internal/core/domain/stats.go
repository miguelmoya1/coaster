package domain

import (
	"slices"
	"time"
)

type DailyRevenue struct {
	DayName string `json:"dayName"`
	Amount  int    `json:"amount"`
	DateStr string `json:"dateStr"`
}

type MonthlyRevenue struct {
	MonthIndex int    `json:"monthIndex"`
	MonthName  string `json:"monthName"`
	Amount     int    `json:"amount"`
}

type EstablishmentStatsHistory struct {
	CurrentMonthRevenue  int              `json:"currentMonthRevenue"`
	PreviousMonthRevenue int              `json:"previousMonthRevenue"`
	YearlyRevenue        int              `json:"yearlyRevenue"`
	MonthlyBreakdown     []MonthlyRevenue `json:"monthlyBreakdown"`
	PercentageChange     int              `json:"percentageChange"`
	IsPositiveChange     bool             `json:"isPositiveChange"`
	MaxMonthRevenue      int              `json:"maxMonthRevenue"`
}

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

type StatsOrder struct {
	AmountPaidCash int
	AmountPaidCard int
	TipAmount      int
	CreatedAt      time.Time
}

var statsDayNames = []string{"Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"}

var statsMonthNames = []string{"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sept", "Oct", "Nov", "Dic"}

const statsDateLayout = "2006-01-02"

func startOfStatsWeek(now time.Time) time.Time {
	daysSinceMonday := (int(now.Weekday()) + 6) % 7
	return time.Date(now.Year(), now.Month(), now.Day()-daysSinceMonday, 0, 0, 0, 0, now.Location())
}

func StatsSince(now time.Time, includeHistory bool) time.Time {
	if includeHistory {
		return time.Date(now.Year()-1, time.January, 1, 0, 0, 0, 0, now.Location())
	}

	startOfWeek := startOfStatsWeek(now)
	return time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day()-7, 0, 0, 0, 0, now.Location())
}

type statsPeriods struct {
	now                 time.Time
	startOfWeek         time.Time
	previousMonth       time.Time
	today               string
	yesterday           string
	sameWeekdayLastWeek string
}

func EstablishmentStatsOf(orders []StatsOrder, now time.Time, includeHistory bool) EstablishmentStats {
	periods := statsPeriods{
		now:                 now,
		startOfWeek:         startOfStatsWeek(now),
		previousMonth:       time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location()),
		today:               now.Format(statsDateLayout),
		yesterday:           now.AddDate(0, 0, -1).Format(statsDateLayout),
		sameWeekdayLastWeek: now.AddDate(0, 0, -7).Format(statsDateLayout),
	}

	stats := newEstablishmentStats(periods.startOfWeek)
	history := newStatsHistory()
	for _, order := range orders {
		createdAt := order.CreatedAt.In(now.Location())
		stats.add(order, createdAt, periods)
		history.add(order.revenue(), createdAt, periods)
	}

	if stats.TodayTicketCount > 0 {
		stats.TodayAverageTicket = roundJS(float64(stats.TodayRevenue) / float64(stats.TodayTicketCount))
	}

	if !includeHistory {
		return stats
	}

	history.PercentageChange, history.IsPositiveChange = monthOverMonth(history.CurrentMonthRevenue, history.PreviousMonthRevenue)
	history.MaxMonthRevenue = 1
	for _, month := range history.MonthlyBreakdown {
		history.MaxMonthRevenue = max(history.MaxMonthRevenue, month.Amount)
	}

	stats.History = &history
	return stats
}

func (o StatsOrder) revenue() int {
	return o.AmountPaidCash + o.AmountPaidCard - o.TipAmount
}

func newEstablishmentStats(startOfWeek time.Time) EstablishmentStats {
	stats := EstablishmentStats{DailyRevenues: make([]DailyRevenue, len(statsDayNames))}
	for i, name := range statsDayNames {
		stats.DailyRevenues[i] = DailyRevenue{DayName: name, DateStr: startOfWeek.AddDate(0, 0, i).Format(statsDateLayout)}
	}
	return stats
}

func (s *EstablishmentStats) add(order StatsOrder, createdAt time.Time, periods statsPeriods) {
	revenue := order.revenue()
	day := createdAt.Format(statsDateLayout)

	switch day {
	case periods.today:
		s.TodayRevenue += revenue
		s.TodayTicketCount++
		s.TodayCashRevenue += order.AmountPaidCash
		s.TodayCardRevenue += order.AmountPaidCard
		s.TodayTipAmount += order.TipAmount
	case periods.yesterday:
		s.YesterdayRevenue += revenue
	case periods.sameWeekdayLastWeek:
		s.SameWeekdayLastWeekRevenue += revenue
	}

	if !createdAt.Before(periods.startOfWeek) {
		s.WeeklyRevenue += revenue
	}
	if i := slices.IndexFunc(s.DailyRevenues, func(d DailyRevenue) bool { return d.DateStr == day }); i >= 0 {
		s.DailyRevenues[i].Amount += revenue
	}
}

func newStatsHistory() EstablishmentStatsHistory {
	history := EstablishmentStatsHistory{MonthlyBreakdown: make([]MonthlyRevenue, len(statsMonthNames))}
	for i, name := range statsMonthNames {
		history.MonthlyBreakdown[i] = MonthlyRevenue{MonthIndex: i, MonthName: name}
	}
	return history
}

func (h *EstablishmentStatsHistory) add(revenue int, createdAt time.Time, periods statsPeriods) {
	if createdAt.Year() == periods.now.Year() {
		h.YearlyRevenue += revenue
		h.MonthlyBreakdown[createdAt.Month()-1].Amount += revenue
		if createdAt.Month() == periods.now.Month() {
			h.CurrentMonthRevenue += revenue
		}
	}
	if createdAt.Year() == periods.previousMonth.Year() && createdAt.Month() == periods.previousMonth.Month() {
		h.PreviousMonthRevenue += revenue
	}
}

func monthOverMonth(current, previous int) (int, bool) {
	switch {
	case previous > 0:
		change := float64(current-previous) / float64(previous)
		percentage := roundJS(change * 100)
		return max(percentage, -percentage), current >= previous
	case current > 0:
		return 100, true
	default:
		return 0, true
	}
}
