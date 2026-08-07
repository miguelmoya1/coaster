import type { BarStats } from '@coaster/common';
import { GetBarStatsQuery } from '@coaster/stats';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, toEuros, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('StatsTools');

export const createStatsTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    getBarStats: tool({
      description:
        'Get the revenue figures of the bar in euros: today, yesterday, this week day by day, this month against the previous one, and the year. Use it for "¿cuánto llevamos hoy?", "¿vamos mejor que el mes pasado?" or any takings question.',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'getBarStats' called`);
        return runner.query<BarStats>('bar:view-dashboard', new GetBarStatsQuery(context.barId), (stats) => ({
          todayRevenue: toEuros(stats.todayRevenue),
          yesterdayRevenue: toEuros(stats.yesterdayRevenue),
          weeklyRevenue: toEuros(stats.weeklyRevenue),
          currentMonthRevenue: toEuros(stats.currentMonthRevenue),
          previousMonthRevenue: toEuros(stats.previousMonthRevenue),
          yearlyRevenue: toEuros(stats.yearlyRevenue),
          monthOverMonthChangePercent: stats.percentageChange,
          isPositiveChange: stats.isPositiveChange,
          dailyRevenues: stats.dailyRevenues.map((day) => ({
            day: day.dayName,
            date: day.dateStr,
            revenue: toEuros(day.amount),
          })),
        }));
      },
    }),
  };
};
