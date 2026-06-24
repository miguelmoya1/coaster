import type { AddOrderItemsDto } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId, asProductId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { AddOrderItemsCommand } from '../impl/add-order-items.command';
import { AddOrderItemsHandler } from './add-order-items.handler';

describe('AddOrderItemsHandler', () => {
  let handler: AddOrderItemsHandler;
  const repository = {
    findById: vi.fn(),
    findProductsByIds: vi.fn(),
    addItemsToOrder: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddOrderItemsHandler,
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: OrdersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<AddOrderItemsHandler>(AddOrderItemsHandler);
  });

  const barId = asBarId('bar-1');
  const orderId = asOrderId('order-1');
  const dto = { items: [{ productId: asProductId('prod-1'), quantity: 1 }] };

  it('should throw NotFoundException if order not found', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(handler.execute(new AddOrderItemsCommand(barId, orderId, dto))).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if order is not open', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED' });

    await expect(handler.execute(new AddOrderItemsCommand(barId, orderId, dto))).rejects.toThrow(BadRequestException);
  });

  it('should add items and publish OrderItemsAddedEvent', async () => {
    const order = {
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      totalAmount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    };
    repository.findById.mockResolvedValue(order);
    repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 5 }]);
    repository.addItemsToOrder.mockResolvedValue({
      ...order,
      totalAmount: 15,
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          productId: 'prod-1',
          quantity: 1,
          priceAtPurchase: 5,
          paidQuantity: 0,
          servedQuantity: 0,
          paymentStatus: 'PENDING',
          deliveryStatus: 'PENDING',
          product: { name: 'prod-1' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await handler.execute(new AddOrderItemsCommand(barId, orderId, dto as AddOrderItemsDto));

    expect(result).toBeUndefined();
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        barId: 'bar-1',
        addedItems: [{ productId: 'prod-1', quantity: 1 }],
      }),
    );
  });
});
