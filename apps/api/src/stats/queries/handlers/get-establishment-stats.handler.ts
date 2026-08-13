import type { EstablishmentStats, EstablishmentStatsHistory, DailyRevenue, MonthlyRevenue } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StatsReadRepository } from '../../data-access/stats.read.repository';
import { GetEstablishmentStatsQuery } from '../impl/get-establishment-stats.query';

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

@Injectable()
@QueryHandler(GetEstablishmentStatsQuery)
export class GetEstablishmentStatsHandler implements IQueryHandler<GetEstablishmentStatsQuery, EstablishmentStats> {
  constructor(private readonly readRepo: StatsReadRepository) {}

  async execute(query: GetEstablishmentStatsQuery): Promise<EstablishmentStats> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfPrevYear = new Date(currentYear - 1, 0, 1);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const since = query.includeHistory ? startOfPrevYear : startOfLastWeek;

    const closedOrders = (await this.readRepo.findClosedOrdersForStats(query.establishmentId, since)).map((order) => ({
      createdAt: order.createdAt,
      revenue: order.amountPaidCash + order.amountPaidCard - order.tipAmount,
      cash: order.amountPaidCash,
      card: order.amountPaidCard,
      tip: order.tipAmount,
    }));

    const todayStr = formatDate(now);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const sameWeekdayLastWeek = new Date(now);
    sameWeekdayLastWeek.setDate(now.getDate() - 7);
    const sameWeekdayLastWeekStr = formatDate(sameWeekdayLastWeek);

    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let sameWeekdayLastWeekRevenue = 0;
    let weeklyRevenue = 0;
    let todayTicketCount = 0;
    let todayCashRevenue = 0;
    let todayCardRevenue = 0;
    let todayTipAmount = 0;

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

      if (orderDateStr === todayStr) {
        todayRevenue += order.revenue;
        todayTicketCount += 1;
        todayCashRevenue += order.cash;
        todayCardRevenue += order.card;
        todayTipAmount += order.tip;
      }
      if (orderDateStr === yesterdayStr) {
        yesterdayRevenue += order.revenue;
      }
      if (orderDateStr === sameWeekdayLastWeekStr) {
        sameWeekdayLastWeekRevenue += order.revenue;
      }
      if (orderDate >= startOfWeek) {
        weeklyRevenue += order.revenue;
      }

      const dayIndex = dailyRevenues.findIndex((dr) => dr.dateStr === orderDateStr);
      if (dayIndex !== -1) {
        dailyRevenues[dayIndex].amount += order.revenue;
      }

      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();

      if (orderYear === currentYear) {
        yearlyRevenue += order.revenue;
        monthlyBreakdown[orderMonth].amount += order.revenue;

        if (orderMonth === currentMonth) {
          currentMonthRevenue += order.revenue;
        }
      }

      if (orderYear === prevMonthYear && orderMonth === prevMonth) {
        previousMonthRevenue += order.revenue;
      }
    });

    const stats: EstablishmentStats = {
      todayRevenue,
      yesterdayRevenue,
      sameWeekdayLastWeekRevenue,
      weeklyRevenue,
      dailyRevenues,
      todayTicketCount,
      todayAverageTicket: todayTicketCount > 0 ? Math.round(todayRevenue / todayTicketCount) : 0,
      todayCashRevenue,
      todayCardRevenue,
      todayTipAmount,
      history: null,
    };

    if (!query.includeHistory) {
      return stats;
    }

    let percentageChange = 0;
    let isPositiveChange = true;
    if (previousMonthRevenue > 0) {
      percentageChange = Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);
      isPositiveChange = currentMonthRevenue >= previousMonthRevenue;
    } else if (currentMonthRevenue > 0) {
      percentageChange = 100;
      isPositiveChange = true;
    }

    const history: EstablishmentStatsHistory = {
      currentMonthRevenue,
      previousMonthRevenue,
      yearlyRevenue,
      monthlyBreakdown,
      percentageChange: Math.abs(percentageChange),
      isPositiveChange,
      maxMonthRevenue: Math.max(...monthlyBreakdown.map((m) => m.amount), 1),
    };

    return { ...stats, history };
  }
}
