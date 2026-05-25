import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutOrderHandler } from './checkout-order.handler';
import { CheckoutOrderCommand } from './checkout-order.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { BarGateway } from '../../../core';
import { asBarId, asOrderId, SocketEvents } from '@coaster/common';

describe('CheckoutOrderHandler', () => {
  let handler: CheckoutOrderHandler;
  let repository = {
    findById: vi.fn(),
    checkoutOrder: vi.fn(),
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
        CheckoutOrderHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<CheckoutOrderHandler>(CheckoutOrderHandler);
  });

  it('should checkout order and free table', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
    repository.checkoutOrder.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

    await handler.execute(new CheckoutOrderCommand(asBarId('bar-1'), asOrderId('order-1')));

    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CLOSED, expect.any(Object));
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'FREE' });
  });
});
