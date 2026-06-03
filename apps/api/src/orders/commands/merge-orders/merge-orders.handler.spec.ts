import type { Order, OrderId, TableId } from '@coaster/common';
import { asBarId, asTableId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMergedEvent } from '../../events';
import { MergeOrdersCommand } from './merge-orders.command';
import { MergeOrdersHandler } from './merge-orders.handler';

describe('MergeOrdersHandler', () => {
  let handler: MergeOrdersHandler;
  const repository = {
    findOrdersByIds: vi.fn(),
    findTableById: vi.fn(),
    mergeOrders: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MergeOrdersHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<MergeOrdersHandler>(MergeOrdersHandler);
  });

  it('should merge orders', async () => {
    repository.findOrdersByIds.mockResolvedValue([
      {
        id: 'order-1',
        barId: 'bar-1',
        status: 'OPEN',
        tableId: 'table-1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'order-2',
        barId: 'bar-1',
        status: 'OPEN',
        tableId: 'table-2',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'OCCUPIED' });
    repository.mergeOrders.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      tableId: 'table-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(
      new MergeOrdersCommand(asBarId('bar-1'), {
        orderIds: ['order-1', 'order-2'] as OrderId[],
        targetTableId: asTableId('table-1'),
      }),
    );

    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrdersMergedEvent(asBarId('bar-1'), expect.any(Object) as unknown as Order, expect.any(Array) as unknown as { id: OrderId; tableId: TableId | null }[]),
    );
  });
});
