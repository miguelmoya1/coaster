import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asTableId } from '../../../core';
import { TableDeletedEvent } from '../../../events';
import { TablesReadRepository } from '../../data-access/tables.read.repository';
import { TablesWriteRepository } from '../../data-access/tables.write.repository';
import { DeleteTableCommand } from './delete-table.command';
import { DeleteTableHandler } from './delete-table.handler';

describe('DeleteTableHandler', () => {
  let handler: DeleteTableHandler;
  const repository = {
    findById: vi.fn(),
    delete: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTableHandler,
        { provide: TablesWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: TablesReadRepository, useValue: repository },
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

  it('should delete the table and publish event', async () => {
    repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-1' });
    repository.delete.mockResolvedValue(undefined);

    const cmd = new DeleteTableCommand(barId, tableId);
    await handler.execute(cmd);

    expect(repository.delete).toHaveBeenCalledWith(tableId);
    expect(eventBus.publish).toHaveBeenCalledWith(new TableDeletedEvent(barId, tableId));
  });
});
