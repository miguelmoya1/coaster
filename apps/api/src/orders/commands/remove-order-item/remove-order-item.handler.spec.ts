import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoveOrderItemHandler } from './remove-order-item.handler';
import { RemoveOrderItemCommand } from './remove-order-item.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { BarGateway } from '../../../core';
import { asBarId, asOrderId, asOrderItemId, SocketEvents } from '@coaster/common';

describe('RemoveOrderItemHandler', () => {
  let handler: RemoveOrderItemHandler;
  let repository = {
    findById: vi.fn(),
    removeItemAndRecalculate: vi.fn(),
  };
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveOrderItemHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
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
        { id: 'item-1', orderId: 'order-1', productId: 'p1', quantity: 1, priceAtPurchase: 2, product: { name: 'P1' }, createdAt: new Date(), updatedAt: new Date(), paymentStatus: 'PENDING', deliveryStatus: 'PENDING' },
        { id: 'item-2', orderId: 'order-1', productId: 'p2', quantity: 1, priceAtPurchase: 3, product: { name: 'P2' }, createdAt: new Date(), updatedAt: new Date(), paymentStatus: 'PENDING', deliveryStatus: 'PENDING' },
      ],
    };
    repository.findById.mockResolvedValue(order);
    repository.removeItemAndRecalculate.mockResolvedValue({
      ...order,
      items: [order.items[1]],
    });

    await handler.execute(new RemoveOrderItemCommand(asBarId('bar-1'), asOrderId('order-1'), asOrderItemId('item-1')));

    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, expect.any(Object));
  });
});
