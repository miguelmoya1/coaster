import type { Order } from '@coaster/common';
import { SocketEvents, TableStatus } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderTableMovedEvent } from '@orders/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asTableId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
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
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, order);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: oldTableId,
      status: TableStatus.FREE,
    });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: newTableId,
      status: TableStatus.OCCUPIED,
    });
  });

  it('should emit ORDER_UPDATED event and occupy the new table if there was no old table', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const newTableId = asTableId('table-2');
    const event = new OrderTableMovedEvent(barId, order, null, newTableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, order);
    expect(barGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: vi.fn(),
      status: TableStatus.FREE,
    });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: newTableId,
      status: TableStatus.OCCUPIED,
    });
  });
});
