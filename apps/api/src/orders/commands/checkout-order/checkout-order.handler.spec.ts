import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutOrderHandler } from './checkout-order.handler';
import { CheckoutOrderCommand } from './checkout-order.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { EventBus } from '@nestjs/cqrs';
import { asBarId, asOrderId } from '@coaster/common';
import { OrderClosedEvent } from '../../events';

describe('CheckoutOrderHandler', () => {
  let handler: CheckoutOrderHandler;
  let repository = {
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
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CheckoutOrderHandler>(CheckoutOrderHandler);
  });

  it('should checkout order and free table', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
    repository.checkoutOrder.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

    await handler.execute(new CheckoutOrderCommand(asBarId('bar-1'), asOrderId('order-1')));

    expect(eventBus.publish).toHaveBeenCalledWith(new OrderClosedEvent(asBarId('bar-1'), expect.any(Object), expect.any(String)));
  });
});
