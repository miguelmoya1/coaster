import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteTableHandler } from './delete-table.handler';
import { DeleteTableCommand } from './delete-table.command';
import { TablesRepository } from '../../data-access/tables.repository';
import { BarGateway } from '../../../core';
import { asBarId, asTableId, SocketEvents } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';

describe('DeleteTableHandler', () => {
  let handler: DeleteTableHandler;
  let repository = {
    findById: vi.fn(),
    delete: vi.fn(),
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
        DeleteTableHandler,
        { provide: TablesRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<DeleteTableHandler>(DeleteTableHandler);
  });

  const barId = asBarId('bar-1');
  const tableId = asTableId('table-1');

  it('should fail if the table does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const cmd = new DeleteTableCommand(barId, tableId);
    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('should delete the table and emit socket event', async () => {
    repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-1' });
    repository.delete.mockResolvedValue(undefined);

    const cmd = new DeleteTableCommand(barId, tableId);
    await handler.execute(cmd);

    expect(repository.delete).toHaveBeenCalledWith(tableId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_DELETED, { id: tableId });
  });
});
