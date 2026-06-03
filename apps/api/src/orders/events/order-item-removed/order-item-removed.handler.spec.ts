import type { Order } from '@coaster/common';
import { asBarId, asProductId } from '../../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrderItemRemovedEvent } from './order-item-removed.event';
import { OrderItemRemovedHandler } from './order-item-removed.handler';

describe('OrderItemRemovedHandler', () => {
  let handler: OrderItemRemovedHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderItemRemovedHandler],
    }).compile();

    handler = module.get<OrderItemRemovedHandler>(OrderItemRemovedHandler);
  });

  it('should compile and run without errors', () => {
    const barId = asBarId('bar-1');
    const order = { id: 'order-1' } as unknown as Order;
    const removedItem = { productId: asProductId('prod-1'), quantity: 2 };
    const event = new OrderItemRemovedEvent(barId, order, removedItem);

    expect(() => handler.handle(event)).not.toThrow();
  });
});
