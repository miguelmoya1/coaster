import type { EstablishmentStats } from '@coaster/common';
import { EstablishmentPermission, hasPermission } from '@coaster/common';
import { GetEstablishmentStatsQuery } from '@coaster/stats';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, toEuros, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('StatsTools');

export const createStatsTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    getEstablishmentStats: tool({
      description:
        'Get the revenue figures of the establishment in euros: today, yesterday, this week day by day, this month against the previous one, and the year. Use it for "¿cuánto llevamos hoy?", "¿vamos mejor que el mes pasado?" or any takings question.',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'getEstablishmentStats' called`);

        const includeHistory =
          context.isAdmin ||
          hasPermission(context.establishmentRole, EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS_HISTORY);

        return runner.query<EstablishmentStats>(
          EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS,
          new GetEstablishmentStatsQuery(context.establishmentId, includeHistory),
          (stats) => ({
            todayRevenue: toEuros(stats.todayRevenue),
            yesterdayRevenue: toEuros(stats.yesterdayRevenue),
            sameWeekdayLastWeekRevenue: toEuros(stats.sameWeekdayLastWeekRevenue),
            weeklyRevenue: toEuros(stats.weeklyRevenue),
            todayTicketCount: stats.todayTicketCount,
            todayAverageTicket: toEuros(stats.todayAverageTicket),
            todayCashRevenue: toEuros(stats.todayCashRevenue),
            todayCardRevenue: toEuros(stats.todayCardRevenue),
            todayTipAmount: toEuros(stats.todayTipAmount),
            dailyRevenues: stats.dailyRevenues.map((day) => ({
              day: day.dayName,
              date: day.dateStr,
              revenue: toEuros(day.amount),
            })),
            history: stats.history
              ? {
                  currentMonthRevenue: toEuros(stats.history.currentMonthRevenue),
                  previousMonthRevenue: toEuros(stats.history.previousMonthRevenue),
                  yearlyRevenue: toEuros(stats.history.yearlyRevenue),
                  monthOverMonthChangePercent: stats.history.percentageChange,
                  isPositiveChange: stats.history.isPositiveChange,
                }
              : null,
          }),
        );
      },
    }),
  };
};
