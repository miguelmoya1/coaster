import { Test, TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { StatsReadRepository } from '../../data-access/stats.read.repository';
import { GetBarStatsHandler } from './get-bar-stats.handler';
import { GetBarStatsQuery } from '../impl/get-bar-stats.query';

describe('GetBarStatsHandler', () => {
  let handler: GetBarStatsHandler;
  const repository = {
    findClosedOrdersForStats: vi.fn(),
  };

  beforeEach(async () => {
    // Freeze clock to Wednesday, June 17, 2026 (same week, same month)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetBarStatsHandler, { provide: StatsReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetBarStatsHandler>(GetBarStatsHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty/zero stats when no closed orders exist', async () => {
    repository.findClosedOrdersForStats.mockResolvedValue([]);

    const result = await handler.execute(new GetBarStatsQuery(asBarId('bar-1')));

    expect(repository.findClosedOrdersForStats).toHaveBeenCalledWith('bar-1', expect.any(Date));
    expect(result.todayRevenue).toBe(0);
    expect(result.yesterdayRevenue).toBe(0);
    expect(result.weeklyRevenue).toBe(0);
    expect(result.currentMonthRevenue).toBe(0);
    expect(result.previousMonthRevenue).toBe(0);
    expect(result.yearlyRevenue).toBe(0);
    expect(result.percentageChange).toBe(0);
    expect(result.isPositiveChange).toBe(true);
    expect(result.maxMonthRevenue).toBe(1);
    expect(result.dailyRevenues.length).toBe(7);
  });

  it('should correctly aggregate revenues and calculate trends', async () => {
    const today = new Date('2026-06-17T10:00:00Z');
    const yesterday = new Date('2026-06-16T15:00:00Z');
    const prevMonthDate = new Date('2026-05-15T12:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { totalAmount: 100, createdAt: today },
      { totalAmount: 50, createdAt: yesterday },
      { totalAmount: 200, createdAt: prevMonthDate },
    ]);

    const result = await handler.execute(new GetBarStatsQuery(asBarId('bar-1')));

    expect(result.todayRevenue).toBe(100);
    expect(result.yesterdayRevenue).toBe(50);
    expect(result.weeklyRevenue).toBe(150);

    // Monthly aggregates
    expect(result.currentMonthRevenue).toBe(150);
    expect(result.previousMonthRevenue).toBe(200);

    // Trend calculations: (150 - 200) / 200 = -25%
    expect(result.percentageChange).toBe(25);
    expect(result.isPositiveChange).toBe(false);
  });

  it('should handle positive trend and 100% change boundary case', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([{ totalAmount: 150, createdAt: today }]);

    const result = await handler.execute(new GetBarStatsQuery(asBarId('bar-1')));

    expect(result.currentMonthRevenue).toBe(150);
    expect(result.previousMonthRevenue).toBe(0);
    expect(result.percentageChange).toBe(100);
    expect(result.isPositiveChange).toBe(true);
  });
});
