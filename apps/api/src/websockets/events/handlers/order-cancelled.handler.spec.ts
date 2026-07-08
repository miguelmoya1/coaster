import type { Order } from '@coaster/common';
import { SocketEvents, TableStatus } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderCancelledEvent } from '@orders/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asTableId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
import { OrderCancelledHandler } from './order-cancelled.handler';

describe('OrderCancelledHandler', () => {
  let handler: OrderCancelledHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderCancelledHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrderCancelledHandler>(OrderCancelledHandler);
  });

  it('should emit ORDER_CANCELLED event and set table status to FREE if table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const tableId = asTableId('table-1');
    const event = new OrderCancelledEvent(barId, order, tableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderCancelled, order);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: tableId,
      status: TableStatus.FREE,
    });
  });

  it('should only emit ORDER_CANCELLED event if no table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderCancelledEvent(barId, order, null);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderCancelled, order);
    expect(barGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.tableStatusChanged, expect.any(Object));
  });
});
