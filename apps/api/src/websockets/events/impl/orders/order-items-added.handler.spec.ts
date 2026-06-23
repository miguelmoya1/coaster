import type { Order } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemsAddedEvent } from '@orders/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asProductId, SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';
import { OrderItemsAddedHandler } from './order-items-added.handler';

describe('OrderItemsAddedHandler', () => {
  let handler: OrderItemsAddedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderItemsAddedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<OrderItemsAddedHandler>(OrderItemsAddedHandler);
  });

  it('should emit ORDER_ITEM_ADDED event', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const addedItems = [{ productId: asProductId('prod-1'), quantity: 3 }];
    const event = new OrderItemsAddedEvent(barId, order, addedItems);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_ITEM_ADDED, order);
  });
});
