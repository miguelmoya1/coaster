import type { Order } from '@coaster/common';
import { SocketEvents, TableStatus } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersMergedEvent } from '@orders/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId, asTableId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
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
    const primaryOrder = { id: 'order-primary' } as unknown as Order;
    const sourceOrders = [
      { id: asOrderId('order-s1'), tableId: asTableId('table-1') },
      { id: asOrderId('order-s2'), tableId: null },
    ];
    const event = new OrdersMergedEvent(barId, primaryOrder, sourceOrders);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, primaryOrder);

    // Check first source order cancellation and table freeing
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderCancelled, { id: 'order-s1' });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: 'table-1',
      status: TableStatus.FREE,
    });

    // Check second source order cancellation (no table)
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderCancelled, { id: 'order-s2' });
  });
});
