import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MergeOrdersHandler } from './merge-orders.handler';
import { MergeOrdersCommand } from './merge-orders.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { BarGateway } from '../../../core';
import { asBarId, SocketEvents } from '@coaster/common';

describe('MergeOrdersHandler', () => {
  let handler: MergeOrdersHandler;
  let repository = {
    findOrdersByIds: vi.fn(),
    findTableById: vi.fn(),
    mergeOrders: vi.fn(),
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
        MergeOrdersHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<MergeOrdersHandler>(MergeOrdersHandler);
  });

  it('should merge orders', async () => {
    repository.findOrdersByIds.mockResolvedValue([
      { id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'order-2', barId: 'bar-1', status: 'OPEN', tableId: 'table-2', items: [], createdAt: new Date(), updatedAt: new Date() },
    ]);
    repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'OCCUPIED' });
    repository.mergeOrders.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

    await handler.execute(new MergeOrdersCommand(asBarId('bar-1'), { orderIds: ['order-1', 'order-2'], targetTableId: 'table-1' }));

    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, expect.any(Object));
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, { id: 'order-2' });
  });
});
