package service

import (
	"context"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type aiStats struct {
	TodayRevenue               float64         `json:"todayRevenue"`
	YesterdayRevenue           float64         `json:"yesterdayRevenue"`
	SameWeekdayLastWeekRevenue float64         `json:"sameWeekdayLastWeekRevenue"`
	WeeklyRevenue              float64         `json:"weeklyRevenue"`
	TodayTicketCount           int             `json:"todayTicketCount"`
	TodayAverageTicket         float64         `json:"todayAverageTicket"`
	TodayCashRevenue           float64         `json:"todayCashRevenue"`
	TodayCardRevenue           float64         `json:"todayCardRevenue"`
	TodayTipAmount             float64         `json:"todayTipAmount"`
	DailyRevenues              []aiDayRevenue  `json:"dailyRevenues"`
	History                    *aiStatsHistory `json:"history"`
}

type aiDayRevenue struct {
	Day     string  `json:"day"`
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
}

type aiStatsHistory struct {
	CurrentMonthRevenue         float64 `json:"currentMonthRevenue"`
	PreviousMonthRevenue        float64 `json:"previousMonthRevenue"`
	YearlyRevenue               float64 `json:"yearlyRevenue"`
	MonthOverMonthChangePercent int     `json:"monthOverMonthChangePercent"`
	IsPositiveChange            bool    `json:"isPositiveChange"`
}

func (s *AIService) statsTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("getEstablishmentStats",
			`Get the revenue figures of the establishment in euros: today, yesterday, this week day by day, this month against the previous one, and the year. Use it for "¿cuánto llevamos hoy?", "¿vamos mejor que el mes pasado?" or any takings question.`,
			func(ctx context.Context, _ aiNoInput) domain.AIToolResult {
				includeHistory := tc.allows(domain.PermissionViewFinancialsHistory)

				return aiQuery(tc, domain.PermissionViewFinancials,
					func() (domain.EstablishmentStats, error) {
						return s.stats.EstablishmentStats(ctx, tc.establishmentID, includeHistory)
					},
					func(stats domain.EstablishmentStats) any {
						days := make([]aiDayRevenue, 0, len(stats.DailyRevenues))
						for _, day := range stats.DailyRevenues {
							days = append(days, aiDayRevenue{Day: day.DayName, Date: day.DateStr, Revenue: toEuros(day.Amount)})
						}

						projected := aiStats{
							TodayRevenue:               toEuros(stats.TodayRevenue),
							YesterdayRevenue:           toEuros(stats.YesterdayRevenue),
							SameWeekdayLastWeekRevenue: toEuros(stats.SameWeekdayLastWeekRevenue),
							WeeklyRevenue:              toEuros(stats.WeeklyRevenue),
							TodayTicketCount:           stats.TodayTicketCount,
							TodayAverageTicket:         toEuros(stats.TodayAverageTicket),
							TodayCashRevenue:           toEuros(stats.TodayCashRevenue),
							TodayCardRevenue:           toEuros(stats.TodayCardRevenue),
							TodayTipAmount:             toEuros(stats.TodayTipAmount),
							DailyRevenues:              days,
						}
						if history := stats.History; history != nil {
							projected.History = &aiStatsHistory{
								CurrentMonthRevenue:         toEuros(history.CurrentMonthRevenue),
								PreviousMonthRevenue:        toEuros(history.PreviousMonthRevenue),
								YearlyRevenue:               toEuros(history.YearlyRevenue),
								MonthOverMonthChangePercent: history.PercentageChange,
								IsPositiveChange:            history.IsPositiveChange,
							}
						}
						return projected
					})
			}),
	}
}
