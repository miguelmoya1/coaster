import { asBarId, asTableId, ErrorCodes, SocketEvents, TableStatus } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../core';
import { TablesRepository } from '../data-access/tables.repository';
import { GetTablesByBarIdHandler } from '../queries/get-tables-by-bar-id/get-tables-by-bar-id.handler';
import { GetTablesByBarIdQuery } from '../queries';
import { CreateTableHandler } from '../commands/create-table/create-table.handler';
import { CreateTableCommand } from '../commands';
import { UpdateTableHandler } from '../commands/update-table/update-table.handler';
import { UpdateTableCommand } from '../commands';
import { DeleteTableHandler } from '../commands/delete-table/delete-table.handler';
import { DeleteTableCommand } from '../commands';

describe('Tables CQRS Handlers', () => {
  let getTablesHandler: GetTablesByBarIdHandler;
  let createTableHandler: CreateTableHandler;
  let updateTableHandler: UpdateTableHandler;
  let deleteTableHandler: DeleteTableHandler;

  let repository = {
    findByBarId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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
        GetTablesByBarIdHandler,
        CreateTableHandler,
        UpdateTableHandler,
        DeleteTableHandler,
        { provide: TablesRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    getTablesHandler = module.get<GetTablesByBarIdHandler>(GetTablesByBarIdHandler);
    createTableHandler = module.get<CreateTableHandler>(CreateTableHandler);
    updateTableHandler = module.get<UpdateTableHandler>(UpdateTableHandler);
    deleteTableHandler = module.get<DeleteTableHandler>(DeleteTableHandler);
    repository = module.get(TablesRepository);
  });

  describe('GetTablesByBarIdHandler', () => {
    it('should return the mapped tables', async () => {
      const barId = asBarId('bar-1');
      const dbTables = [
        {
          id: 'table-1',
          barId: 'bar-1',
          name: 'Mesa 1',
          status: 'FREE',
          createdAt: new Date('2026-05-01T08:00:00Z'),
          updatedAt: new Date('2026-05-01T08:00:00Z'),
        },
      ];
      repository.findByBarId.mockResolvedValue(dbTables);

      const result = await getTablesHandler.execute(new GetTablesByBarIdQuery(barId));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(asTableId('table-1'));
      expect(result[0].status).toBe(TableStatus.FREE);
    });
  });

  describe('CreateTableHandler', () => {
    it('should create the table and emit socket event', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'Mesa 1' };
      const dbTable = {
        id: 'table-1',
        barId: 'bar-1',
        name: 'Mesa 1',
        status: 'FREE',
        createdAt: new Date('2026-05-01T08:00:00Z'),
        updatedAt: new Date('2026-05-01T08:00:00Z'),
      };
      repository.create.mockResolvedValue(dbTable);

      const result = await createTableHandler.execute(new CreateTableCommand(barId, dto));

      expect(repository.create).toHaveBeenCalledWith(barId, { name: 'Mesa 1' });
      expect(barGateway.server.to).toHaveBeenCalledWith(barId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_CREATED, expect.any(Object));
      expect(result).toEqual({ id: asTableId('table-1') });
    });
  });

  describe('UpdateTableHandler', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');
    const dto = { name: 'Mesa Actualizada' };

    it('should fail if the table does not exist or belongs to another bar', async () => {
      repository.findById.mockResolvedValue(null);

      const cmd = new UpdateTableCommand(barId, tableId, dto);
      await expect(updateTableHandler.execute(cmd)).rejects.toThrow(NotFoundException);
      await expect(updateTableHandler.execute(cmd)).rejects.toThrow(ErrorCodes.TABLE_NOT_FOUND);
    });

    it('should fail if the table belongs to a different bar', async () => {
      repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-other' });

      const cmd = new UpdateTableCommand(barId, tableId, dto);
      await expect(updateTableHandler.execute(cmd)).rejects.toThrow(NotFoundException);
    });

    it('should update the table and emit socket event', async () => {
      repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-1' });
      const dbTable = {
        id: 'table-1',
        barId: 'bar-1',
        name: 'Mesa Actualizada',
        status: 'FREE',
        createdAt: new Date('2026-05-01T08:00:00Z'),
        updatedAt: new Date('2026-05-01T09:00:00Z'),
      };
      repository.update.mockResolvedValue(dbTable);

      const cmd = new UpdateTableCommand(barId, tableId, dto);
      await updateTableHandler.execute(cmd);

      expect(repository.update).toHaveBeenCalledWith(tableId, dto);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_UPDATED, expect.any(Object));
    });
  });

  describe('DeleteTableHandler', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');

    it('should fail if the table does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const cmd = new DeleteTableCommand(barId, tableId);
      await expect(deleteTableHandler.execute(cmd)).rejects.toThrow(NotFoundException);
    });

    it('should delete the table and emit socket event', async () => {
      repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-1' });
      repository.delete.mockResolvedValue(undefined);

      const cmd = new DeleteTableCommand(barId, tableId);
      await deleteTableHandler.execute(cmd);

      expect(repository.delete).toHaveBeenCalledWith(tableId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_DELETED, { id: tableId });
    });
  });
});
