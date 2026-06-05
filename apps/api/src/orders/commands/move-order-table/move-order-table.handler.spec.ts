import type { Order, TableId } from '@coaster/common';
import { asBarId, asOrderId, asTableId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderTableMovedEvent } from '../../../events';
import { MoveOrderTableCommand } from './move-order-table.command';
import { MoveOrderTableHandler } from './move-order-table.handler';

describe('MoveOrderTableHandler', () => {
  let handler: MoveOrderTableHandler;
  const repository = {
    findById: vi.fn(),
    findTableById: vi.fn(),
    moveTable: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoveOrderTableHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<MoveOrderTableHandler>(MoveOrderTableHandler);
  });

  it('should move table and update statuses', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      tableId: 'table-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.findTableById.mockResolvedValue({ id: 'table-2', barId: 'bar-1', status: 'FREE', name: 'Mesa 2' });
    repository.moveTable.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      tableId: 'table-2',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(new MoveOrderTableCommand(asBarId('bar-1'), asOrderId('order-1'), { tableId: asTableId('table-2') }));

    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrderTableMovedEvent(asBarId('bar-1'), expect.any(Object) as unknown as Order, expect.any(String) as unknown as TableId | null, expect.any(String) as unknown as TableId),
    );
  });
});
