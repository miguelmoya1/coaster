import type { Order } from '@coaster/common';
import { asBarId, asTableId, SocketEvents } from '../../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../../websockets';
import { OrderClosedEvent } from './order-closed.event';
import { OrderClosedHandler } from './order-closed.handler';

describe('OrderClosedHandler', () => {
  let handler: OrderClosedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderClosedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrderClosedHandler>(OrderClosedHandler);
  });

  it('should emit ORDER_CLOSED event and set table status to FREE if table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const tableId = asTableId('table-1');
    const event = new OrderClosedEvent(barId, order, tableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CLOSED, order);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: tableId,
      status: 'FREE',
    });
  });

  it('should only emit ORDER_CLOSED event if no table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderClosedEvent(barId, order, null);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CLOSED, order);
    expect(barGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, expect.any(Object));
  });
});
