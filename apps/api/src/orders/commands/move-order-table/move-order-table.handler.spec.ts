import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveOrderTableHandler } from './move-order-table.handler';
import { MoveOrderTableCommand } from './move-order-table.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { EventBus } from '@nestjs/cqrs';
import { asBarId, asOrderId } from '@coaster/common';
import { OrderTableMovedEvent } from '../../events';

describe('MoveOrderTableHandler', () => {
  let handler: MoveOrderTableHandler;
  let repository = {
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
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
    repository.findTableById.mockResolvedValue({ id: 'table-2', barId: 'bar-1', status: 'FREE', name: 'Mesa 2' });
    repository.moveTable.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-2', items: [], createdAt: new Date(), updatedAt: new Date() });

    await handler.execute(new MoveOrderTableCommand(asBarId('bar-1'), asOrderId('order-1'), { tableId: 'table-2' }));

    expect(eventBus.publish).toHaveBeenCalledWith(new OrderTableMovedEvent(asBarId('bar-1'), expect.any(Object), expect.any(String), expect.any(String)));
  });
});
