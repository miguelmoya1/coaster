import { asBarId, SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarGateway } from '../../../core';
import { OrderUpdatedEvent } from './order-updated.event';
import { OrderUpdatedHandler } from './order-updated.handler';

describe('OrderUpdatedHandler', () => {
  let handler: OrderUpdatedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderUpdatedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrderUpdatedHandler>(OrderUpdatedHandler);
  });

  it('should emit ORDER_UPDATED event', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as any;
    const event = new OrderUpdatedEvent(barId, order);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, order);
  });
});
