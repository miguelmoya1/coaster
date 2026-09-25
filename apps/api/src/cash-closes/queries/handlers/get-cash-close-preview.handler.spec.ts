import { asEstablishmentId, OrderStatus } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CashClosesReadRepository } from '../../data-access/cash-closes.read.repository';
import { GetCashClosePreviewQuery } from '../impl/get-cash-close-preview.query';
import { GetCashClosePreviewHandler } from './get-cash-close-preview.handler';

describe('GetCashClosePreviewHandler', () => {
  let handler: GetCashClosePreviewHandler;
  const repository = {
    findLast: vi.fn(),
    findUnclosedOrders: vi.fn(),
    findOpenOrdersCharges: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetCashClosePreviewHandler, { provide: CashClosesReadRepository, useValue: repository }],
    }).compile();

    handler = module.get(GetCashClosePreviewHandler);
  });

  it('should start from the beginning with no float when the till was never closed', async () => {
    repository.findLast.mockResolvedValue(null);
    repository.findUnclosedOrders.mockResolvedValue([]);
    repository.findOpenOrdersCharges.mockResolvedValue([]);

    const preview = await handler.execute(new GetCashClosePreviewQuery(asEstablishmentId('establishment-1')));

    expect(preview.since).toBeNull();
    expect(preview.openingFloat).toBe(0);
  });

  it('should start where the last close ended and offer its float again', async () => {
    const closedAt = new Date('2026-09-23T23:40:00.000Z');
    repository.findLast.mockResolvedValue({ closedAt, openingFloat: 15000 });
    repository.findUnclosedOrders.mockResolvedValue([
      {
        status: OrderStatus.CLOSED,
        amountPaidCash: 1100,
        amountPaidCard: 0,
        tipAmount: 0,
        items: [],
        adjustments: [],
      },
    ]);
    repository.findOpenOrdersCharges.mockResolvedValue([
      { amountPaidCash: 500, amountPaidCard: 0 },
      { amountPaidCash: 0, amountPaidCard: 250 },
    ]);

    const preview = await handler.execute(new GetCashClosePreviewQuery(asEstablishmentId('establishment-1')));

    expect(preview).toMatchObject({
      since: closedAt.toISOString(),
      openingFloat: 15000,
      closedOrders: 1,
      cashAmount: 1100,
      openOrders: 2,
      openOrdersCharged: 750,
    });
  });
});
