import type { Order, TableId } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderClosedEvent } from '../../events';
import { CheckoutOrderCommand } from './checkout-order.command';
import { CheckoutOrderHandler } from './checkout-order.handler';

describe('CheckoutOrderHandler', () => {
  let handler: CheckoutOrderHandler;
  const repository = {
    findById: vi.fn(),
    checkoutOrder: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutOrderHandler,
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: OrdersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<CheckoutOrderHandler>(CheckoutOrderHandler);
  });

  it('should checkout order and free table', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      tableId: 'table-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.checkoutOrder.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'CLOSED',
      tableId: 'table-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(new CheckoutOrderCommand(asBarId('bar-1'), asOrderId('order-1'), 'CARD'));

    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrderClosedEvent(
        asBarId('bar-1'),
        expect.any(Object) as unknown as Order,
        expect.any(String) as unknown as TableId,
      ),
    );
  });
});
