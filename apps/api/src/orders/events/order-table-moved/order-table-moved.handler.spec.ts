import { asBarId, asTableId, Order, SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../../core';
import { OrderTableMovedEvent } from './order-table-moved.event';
import { OrderTableMovedHandler } from './order-table-moved.handler';

describe('OrderTableMovedHandler', () => {
  let handler: OrderTableMovedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderTableMovedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrderTableMovedHandler>(OrderTableMovedHandler);
  });

  it('should emit ORDER_UPDATED event, free the old table, and occupy the new table', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const oldTableId = asTableId('table-1');
    const newTableId = asTableId('table-2');
    const event = new OrderTableMovedEvent(barId, order, oldTableId, newTableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, order);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: oldTableId,
      status: 'FREE',
    });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: newTableId,
      status: 'OCCUPIED',
    });
  });

  it('should emit ORDER_UPDATED event and occupy the new table if there was no old table', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const newTableId = asTableId('table-2');
    const event = new OrderTableMovedEvent(barId, order, null, newTableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, order);
    expect(barGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: expect.any(String),
      status: 'FREE',
    });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: newTableId,
      status: 'OCCUPIED',
    });
  });
});
