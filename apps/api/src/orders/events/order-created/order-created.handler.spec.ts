import { asBarId, asTableId, SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarGateway } from '../../../core';
import { OrderCreatedEvent } from './order-created.event';
import { OrderCreatedHandler } from './order-created.handler';

describe('OrderCreatedHandler', () => {
  let handler: OrderCreatedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderCreatedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrderCreatedHandler>(OrderCreatedHandler);
  });

  it('should emit ORDER_CREATED event and set table status to OCCUPIED if table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as any;
    const tableId = asTableId('table-1');
    const event = new OrderCreatedEvent(barId, order, tableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CREATED, order);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
      id: tableId,
      status: 'OCCUPIED',
    });
  });

  it('should only emit ORDER_CREATED event if no table exists', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as any;
    const event = new OrderCreatedEvent(barId, order, null);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CREATED, order);
    expect(barGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, expect.any(Object));
  });
});
