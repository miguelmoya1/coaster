import type { BarStats, DailyRevenue, MonthlyRevenue } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StatsRepository } from '../../data-access/stats.repository';
import { GetBarStatsQuery } from './get-bar-stats.query';

@Injectable()
@QueryHandler(GetBarStatsQuery)
export class GetBarStatsHandler implements IQueryHandler<GetBarStatsQuery, BarStats> {
  constructor(private readonly _statsRepository: StatsRepository) {}

  async execute(query: GetBarStatsQuery): Promise<BarStats> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Previous Year Start (to calculate previous month if current month is January)
    const startOfPrevYear = new Date(currentYear - 1, 0, 1);

    const closedOrders = await this._statsRepository.findClosedOrdersForStats(query.barId, startOfPrevYear);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const todayStr = formatDate(now);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // Current Week start (Monday)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let weeklyRevenue = 0;

    // Last 7 days breakdown for the weekly SVG chart
    const dailyRevenues: DailyRevenue[] = [];
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dailyRevenues.push({
        dayName: days[i],
        amount: 0,
        dateStr: formatDate(d),
      });
    }

    // Monthly & Yearly metrics
    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    let yearlyRevenue = 0;

    let prevMonth = currentMonth - 1;
    let prevMonthYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevMonthYear = currentYear - 1;
    }

    const monthlyBreakdown: MonthlyRevenue[] = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentYear, i, 1);
      const monthName = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
      return {
        monthIndex: i,
        monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        amount: 0,
      };
    });

    closedOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const orderDateStr = formatDate(orderDate);

      // Financials (today, yesterday, weekly, daily series)
      if (orderDateStr === todayStr) {
        todayRevenue += order.totalAmount;
      }
      if (orderDateStr === yesterdayStr) {
        yesterdayRevenue += order.totalAmount;
      }
      if (orderDate >= startOfWeek) {
        weeklyRevenue += order.totalAmount;
      }

      const dayIndex = dailyRevenues.findIndex((dr) => dr.dateStr === orderDateStr);
      if (dayIndex !== -1) {
        dailyRevenues[dayIndex].amount += order.totalAmount;
      }

      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();

      // Current Year Accumulation
      if (orderYear === currentYear) {
        yearlyRevenue += order.totalAmount;
        monthlyBreakdown[orderMonth].amount += order.totalAmount;

        if (orderMonth === currentMonth) {
          currentMonthRevenue += order.totalAmount;
        }
      }

      // Previous Month Accumulation
      if (orderYear === prevMonthYear && orderMonth === prevMonth) {
        previousMonthRevenue += order.totalAmount;
      }
    });

    // Calculate Trend
    let percentageChange = 0;
    let isPositiveChange = true;
    if (previousMonthRevenue > 0) {
      percentageChange = Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);
      isPositiveChange = currentMonthRevenue >= previousMonthRevenue;
    } else if (currentMonthRevenue > 0) {
      percentageChange = 100;
      isPositiveChange = true;
    }

    const maxMonthRevenue = Math.max(...monthlyBreakdown.map((m) => m.amount), 1);

    return {
      todayRevenue,
      yesterdayRevenue,
      weeklyRevenue,
      dailyRevenues,
      currentMonthRevenue,
      previousMonthRevenue,
      yearlyRevenue,
      monthlyBreakdown,
      percentageChange: Math.abs(percentageChange),
      isPositiveChange,
      maxMonthRevenue,
    };
  }
}
