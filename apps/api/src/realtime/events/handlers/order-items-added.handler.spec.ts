import type { Order } from '@coaster/common';
import { asEstablishmentId, asProductId, SocketEvents } from '@coaster/common';
import { OrderItemsAddedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { OrderItemsAddedHandler } from './order-items-added.handler';

describe('OrderItemsAddedHandler', () => {
  let handler: OrderItemsAddedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderItemsAddedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<OrderItemsAddedHandler>(OrderItemsAddedHandler);
  });

  it('should emit ORDER_ITEM_ADDED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const addedItems = [{ productId: asProductId('prod-1'), quantity: 3 }];
    const event = new OrderItemsAddedEvent(establishmentId, order, addedItems);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderItemAdded, order);
  });
});
