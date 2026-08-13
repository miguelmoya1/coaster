import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatsReadRepository } from '../../data-access/stats.read.repository';
import { GetEstablishmentStatsQuery } from '../impl/get-establishment-stats.query';
import { GetEstablishmentStatsHandler } from './get-establishment-stats.handler';

const establishmentId = asEstablishmentId('establishment-1');
const withHistory = new GetEstablishmentStatsQuery(establishmentId, true);
const withoutHistory = new GetEstablishmentStatsQuery(establishmentId, false);

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

    const result = await handler.execute(withHistory);

    expect(repository.findClosedOrdersForStats).toHaveBeenCalledWith('establishment-1', expect.any(Date));
    expect(result.todayRevenue).toBe(0);
    expect(result.yesterdayRevenue).toBe(0);
    expect(result.weeklyRevenue).toBe(0);
    expect(result.todayTicketCount).toBe(0);
    expect(result.todayAverageTicket).toBe(0);
    expect(result.history?.currentMonthRevenue).toBe(0);
    expect(result.history?.previousMonthRevenue).toBe(0);
    expect(result.history?.yearlyRevenue).toBe(0);
    expect(result.history?.percentageChange).toBe(0);
    expect(result.history?.isPositiveChange).toBe(true);
    expect(result.history?.maxMonthRevenue).toBe(1);
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

    const result = await handler.execute(withHistory);

    expect(result.todayRevenue).toBe(100);
    expect(result.yesterdayRevenue).toBe(50);
    expect(result.weeklyRevenue).toBe(150);

    expect(result.history?.currentMonthRevenue).toBe(150);
    expect(result.history?.previousMonthRevenue).toBe(200);

    expect(result.history?.percentageChange).toBe(25);
    expect(result.history?.isPositiveChange).toBe(false);
  });

  it('should count what was actually taken, not the price before the discount', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 900, amountPaidCard: 0, tipAmount: 0, createdAt: today },
    ]);

    const result = await handler.execute(withHistory);

    expect(result.todayRevenue).toBe(900);
  });

  it('should leave tips out of the revenue', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 1000, amountPaidCard: 200, tipAmount: 200, createdAt: today },
    ]);

    const result = await handler.execute(withHistory);

    expect(result.todayRevenue).toBe(1000);
    expect(result.weeklyRevenue).toBe(1000);
  });

  it('should report tips and the cash/card split separately, so the till can be counted', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 1000, amountPaidCard: 200, tipAmount: 200, createdAt: today },
    ]);

    const result = await handler.execute(withHistory);

    expect(result.todayCashRevenue).toBe(1000);
    expect(result.todayCardRevenue).toBe(200);
    expect(result.todayTipAmount).toBe(200);
  });

  it('should average the ticket over the tickets closed today only', async () => {
    const today = new Date('2026-06-17T10:00:00Z');
    const yesterday = new Date('2026-06-16T15:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 300, amountPaidCard: 0, tipAmount: 0, createdAt: today },
      { amountPaidCash: 200, amountPaidCard: 0, tipAmount: 0, createdAt: today },
      { amountPaidCash: 9999, amountPaidCard: 0, tipAmount: 0, createdAt: yesterday },
    ]);

    const result = await handler.execute(withHistory);

    expect(result.todayTicketCount).toBe(2);
    expect(result.todayAverageTicket).toBe(250);
  });

  it('should compare today against the same weekday of last week', async () => {
    const today = new Date('2026-06-17T10:00:00Z');
    const sameWeekdayLastWeek = new Date('2026-06-10T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 500, amountPaidCard: 0, tipAmount: 0, createdAt: today },
      { amountPaidCash: 400, amountPaidCard: 0, tipAmount: 0, createdAt: sameWeekdayLastWeek },
    ]);

    const result = await handler.execute(withHistory);

    expect(result.todayRevenue).toBe(500);
    expect(result.sameWeekdayLastWeekRevenue).toBe(400);
  });

  it('should withhold the month and year figures when history is not allowed', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 500, amountPaidCard: 0, tipAmount: 0, createdAt: today },
    ]);

    const result = await handler.execute(withoutHistory);

    expect(result.history).toBeNull();
    expect(result.todayRevenue).toBe(500);
    expect(result.weeklyRevenue).toBe(500);
  });

  it('should not even read a year of orders when history is not allowed', async () => {
    repository.findClosedOrdersForStats.mockResolvedValue([]);

    await handler.execute(withoutHistory);

    const [, since] = repository.findClosedOrdersForStats.mock.calls.at(-1) as [string, Date];
    const twoWeeksAgo = new Date('2026-06-03T00:00:00Z');

    expect(since.getTime()).toBeGreaterThan(twoWeeksAgo.getTime());
  });

  it('should handle positive trend and 100% change boundary case', async () => {
    const today = new Date('2026-06-17T10:00:00Z');

    repository.findClosedOrdersForStats.mockResolvedValue([
      { amountPaidCash: 150, amountPaidCard: 0, tipAmount: 0, createdAt: today },
    ]);

    const result = await handler.execute(withHistory);

    expect(result.history?.currentMonthRevenue).toBe(150);
    expect(result.history?.previousMonthRevenue).toBe(0);
    expect(result.history?.percentageChange).toBe(100);
    expect(result.history?.isPositiveChange).toBe(true);
  });
});
