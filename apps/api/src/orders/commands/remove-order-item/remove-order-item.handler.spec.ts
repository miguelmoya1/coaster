import type { Order } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId, asOrderItemId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderUpdatedEvent } from '../../events';
import { RemoveOrderItemCommand } from './remove-order-item.command';
import { RemoveOrderItemHandler } from './remove-order-item.handler';

describe('RemoveOrderItemHandler', () => {
  let handler: RemoveOrderItemHandler;
  const repository = {
    findById: vi.fn(),
    removeItemAndRecalculate: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveOrderItemHandler,
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: OrdersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<RemoveOrderItemHandler>(RemoveOrderItemHandler);
  });

  it('should remove item', async () => {
    const order = {
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      tableId: 'table-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          productId: 'p1',
          quantity: 1,
          priceAtPurchase: 2,
          product: { name: 'P1' },
          createdAt: new Date(),
          updatedAt: new Date(),
          paymentStatus: 'PENDING',
          deliveryStatus: 'PENDING',
        },
        {
          id: 'item-2',
          orderId: 'order-1',
          productId: 'p2',
          quantity: 1,
          priceAtPurchase: 3,
          product: { name: 'P2' },
          createdAt: new Date(),
          updatedAt: new Date(),
          paymentStatus: 'PENDING',
          deliveryStatus: 'PENDING',
        },
      ],
    };
    repository.findById.mockResolvedValue(order);
    repository.removeItemAndRecalculate.mockResolvedValue({
      ...order,
      items: [order.items[1]],
    });

    await handler.execute(new RemoveOrderItemCommand(asBarId('bar-1'), asOrderId('order-1'), asOrderItemId('item-1')));

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        barId: 'bar-1',
        removedItem: { productId: 'p1', quantity: 1 },
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrderUpdatedEvent(asBarId('bar-1'), expect.any(Object) as unknown as Order),
    );
  });
});
