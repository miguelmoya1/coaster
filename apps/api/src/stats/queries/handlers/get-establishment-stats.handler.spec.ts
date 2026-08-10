import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatsReadRepository } from '../../data-access/stats.read.repository';
import { GetEstablishmentStatsQuery } from '../impl/get-establishment-stats.query';
import { GetEstablishmentStatsHandler } from './get-establishment-stats.handler';

describe('GetEstablishmentStatsHandler', () => {
  let handler: GetEstablishmentStatsHandler;
  const repository = {
    findClosedOrdersForStats: vi.fn(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetEstablishmentStatsHandler, { provide: StatsReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetEstablishmentStatsHandler>(GetEstablishmentStatsHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty/zero stats when no closed orders exist', async () => {
    repository.findClosedOrdersForStats.mockResolvedValue([]);

    const result = await handler.execute(new GetEstablishmentStatsQuery(asEstablishmentId('establishment-1')));

    expect(repository.findClosedOrdersForStats).toHaveBeenCalledWith('establishment-1', expect.any(Date));
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
      { amountPaidCash: 100, amountPaidCard: 0, tipAmount: 0, createdAt: today },
      { amountPaidCash: 0, amountPaidCard: 50, tipAmount: 0, createdAt: yesterday },
      { amountPaidCash: 200, amountPaidCard: 0, tipAmount: 0, createdAt: prevMonthDate },
    ]);

    const result = await handler.execute(new GetEstablishmentStatsQuery(asEstablishmentId('establishment-1')));

    expect(result.todayRevenue).toBe(100);
    expect(result.yesterdayRevenue).toBe(50);
    expect(result.weeklyRevenue).toBe(150);

    expect(result.currentMonthRevenue).toBe(150);
    expect(result.previousMonthRevenue).toBe(200);

    expect(result.percentageChange).toBe(25);
    expect(result.isPositiveChange).toBe(false);
  });

  it('should count what was actually taken, not the price before the discount', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 900, amountPaidCard: 0, tipAmount: 0, createdAt: today },
    ]);

    const result = await handler.execute(new GetEstablishmentStatsQuery(asEstablishmentId('establishment-1')));

    expect(result.todayRevenue).toBe(900);
  });

  it('should leave tips out of the revenue', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 1000, amountPaidCard: 200, tipAmount: 200, createdAt: today },
    ]);

    const result = await handler.execute(new GetEstablishmentStatsQuery(asEstablishmentId('establishment-1')));

    expect(result.todayRevenue).toBe(1000);
    expect(result.weeklyRevenue).toBe(1000);
  });

  it('should handle positive trend and 100% change boundary case', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 150, amountPaidCard: 0, tipAmount: 0, createdAt: today },
    ]);

    const result = await handler.execute(new GetEstablishmentStatsQuery(asEstablishmentId('establishment-1')));

    expect(result.currentMonthRevenue).toBe(150);
    expect(result.previousMonthRevenue).toBe(0);
    expect(result.percentageChange).toBe(100);
    expect(result.isPositiveChange).toBe(true);
  });
});
