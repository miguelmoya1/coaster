import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveOrderTableHandler } from './move-order-table.handler';
import { MoveOrderTableCommand } from './move-order-table.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { BarGateway } from '../../../core';
import { asBarId, asOrderId, SocketEvents } from '@coaster/common';

describe('MoveOrderTableHandler', () => {
  let handler: MoveOrderTableHandler;
  let repository = {
    findById: vi.fn(),
    findTableById: vi.fn(),
    moveTable: vi.fn(),
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
        MoveOrderTableHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<MoveOrderTableHandler>(MoveOrderTableHandler);
  });

  it('should move table and update statuses', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
    repository.findTableById.mockResolvedValue({ id: 'table-2', barId: 'bar-1', status: 'FREE', name: 'Mesa 2' });
    repository.moveTable.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-2', items: [], createdAt: new Date(), updatedAt: new Date() });

    await handler.execute(new MoveOrderTableCommand(asBarId('bar-1'), asOrderId('order-1'), { tableId: 'table-2' }));

    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'FREE' });
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-2', status: 'OCCUPIED' });
  });
});
