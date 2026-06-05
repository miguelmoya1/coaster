import type { Order } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderCancelledEvent } from '../../../../events';
import { asBarId, asTableId, SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';
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
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, order);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: tableId,
      status: 'FREE',
    });
  });

  it('should only emit ORDER_CANCELLED event if no table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderCancelledEvent(barId, order, null);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, order);
    expect(barGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, expect.any(Object));
  });
});
