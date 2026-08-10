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

export interface EstablishmentStats {
  todayRevenue: number;
  yesterdayRevenue: number;
  weeklyRevenue: number;
  dailyRevenues: DailyRevenue[];
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  yearlyRevenue: number;
  monthlyBreakdown: MonthlyRevenue[];
  percentageChange: number;
  isPositiveChange: boolean;
  maxMonthRevenue: number;
}
