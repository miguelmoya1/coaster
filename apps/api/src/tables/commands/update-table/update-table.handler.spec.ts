import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateTableHandler } from './update-table.handler';
import { UpdateTableCommand } from './update-table.command';
import { TablesRepository } from '../../data-access/tables.repository';
import { BarGateway } from '../../../core';
import { asBarId, asTableId, SocketEvents, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';

describe('UpdateTableHandler', () => {
  let handler: UpdateTableHandler;
  let repository = {
    findById: vi.fn(),
    update: vi.fn(),
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
        UpdateTableHandler,
        { provide: TablesRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<UpdateTableHandler>(UpdateTableHandler);
  });

  const barId = asBarId('bar-1');
  const tableId = asTableId('table-1');
  const dto = { name: 'Mesa Actualizada' };

  it('should fail if the table does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const cmd = new UpdateTableCommand(barId, tableId, dto);
    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('should fail if the table belongs to a different bar', async () => {
    repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-other' });

    const cmd = new UpdateTableCommand(barId, tableId, dto);
    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('should update the table and emit socket event', async () => {
    repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-1' });
    const dbTable = {
      id: 'table-1',
      barId: 'bar-1',
      name: 'Mesa Actualizada',
      status: 'FREE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repository.update.mockResolvedValue(dbTable);

    const cmd = new UpdateTableCommand(barId, tableId, dto);
    await handler.execute(cmd);

    expect(repository.update).toHaveBeenCalledWith(tableId, dto);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_UPDATED, expect.any(Object));
  });
});
