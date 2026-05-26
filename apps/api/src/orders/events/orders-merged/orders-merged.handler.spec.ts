import { asBarId, asOrderId, asTableId, SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarGateway } from '../../../core';
import { OrdersMergedEvent } from './orders-merged.event';
import { OrdersMergedHandler } from './orders-merged.handler';

describe('OrdersMergedHandler', () => {
  let handler: OrdersMergedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersMergedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrdersMergedHandler>(OrdersMergedHandler);
  });

  it('should emit ORDER_UPDATED for primary order, cancel source orders and free their tables', () => {
    const barId = asBarId('bar-1');
    const primaryOrder = { id: 'order-primary' } as any;
    const sourceOrders = [
      { id: asOrderId('order-s1'), tableId: asTableId('table-1') },
      { id: asOrderId('order-s2'), tableId: null },
    ];
    const event = new OrdersMergedEvent(barId, primaryOrder, sourceOrders);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, primaryOrder);

    // Check first source order cancellation and table freeing
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, { id: 'order-s1' });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: 'table-1',
      status: 'FREE',
    });

    // Check second source order cancellation (no table)
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, { id: 'order-s2' });
  });
});
