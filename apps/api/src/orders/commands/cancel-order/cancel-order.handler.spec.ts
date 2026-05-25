import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelOrderHandler } from './cancel-order.handler';
import { CancelOrderCommand } from './cancel-order.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { BarGateway } from '../../../core';
import { asBarId, asOrderId, SocketEvents } from '@coaster/common';

describe('CancelOrderHandler', () => {
  let handler: CancelOrderHandler;
  let repository = {
    findById: vi.fn(),
    cancelOrder: vi.fn(),
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
        CancelOrderHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<CancelOrderHandler>(CancelOrderHandler);
  });

  it('should cancel order and free table', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
    repository.cancelOrder.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CANCELLED', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

    await handler.execute(new CancelOrderCommand(asBarId('bar-1'), asOrderId('order-1')));

    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, expect.any(Object));
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'FREE' });
  });
});
