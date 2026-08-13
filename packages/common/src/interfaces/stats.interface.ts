export interface DailyRevenue {
  dayName: string;
  amount: number;
  dateStr: string;
}

export interface MonthlyRevenue {
  monthIndex: number;
  monthName: string;
  amount: number;
}

export interface EstablishmentStatsHistory {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  yearlyRevenue: number;
  monthlyBreakdown: MonthlyRevenue[];
  percentageChange: number;
  isPositiveChange: boolean;
  maxMonthRevenue: number;
}

export interface EstablishmentStats {
  todayRevenue: number;
  yesterdayRevenue: number;
  sameWeekdayLastWeekRevenue: number;
  weeklyRevenue: number;
  dailyRevenues: DailyRevenue[];
  todayTicketCount: number;
  todayAverageTicket: number;
  todayCashRevenue: number;
  todayCardRevenue: number;
  todayTipAmount: number;
  history: EstablishmentStatsHistory | null;
}
