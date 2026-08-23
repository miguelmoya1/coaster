import type { Order } from '@coaster/common';
import { asEstablishmentId, asProductId, RealtimeEvents } from '@coaster/common';
import { OrderItemsAddedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrderItemsAddedHandler } from './order-items-added.handler';

describe('OrderItemsAddedHandler', () => {
  let handler: OrderItemsAddedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderItemsAddedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<OrderItemsAddedHandler>(OrderItemsAddedHandler);
  });

  it('should emit ORDER_ITEM_ADDED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const addedItems = [{ productId: asProductId('prod-1'), quantity: 3 }];
    const event = new OrderItemsAddedEvent(establishmentId, order, addedItems);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderItemAdded, order);
  });
});
