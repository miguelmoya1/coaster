import { asBarId, asTableId, ErrorCodes, SocketEvents, TableStatus } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../core';
import { TablesRepository } from '../data-access/tables.repository';
import { TablesService } from './tables.service';

describe('TablesService', () => {
  let service: TablesService;
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
        TablesService,
        { provide: TablesRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    repository = module.get(TablesRepository);
  });

  describe('getTablesByBarId', () => {
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

      const result = await service.getTablesByBarId(barId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(asTableId('table-1'));
      expect(result[0].status).toBe(TableStatus.FREE);
    });
  });

  describe('createTable', () => {
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

      const result = await service.createTable(barId, dto);

      expect(repository.create).toHaveBeenCalledWith(barId, { name: 'Mesa 1' });
      expect(barGateway.server.to).toHaveBeenCalledWith(barId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_CREATED, result);
      expect(result.name).toBe('Mesa 1');
    });
  });

  describe('updateTable', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');
    const dto = { name: 'Mesa Actualizada' };

    it('should fail if the table does not exist or belongs to another bar', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateTable(barId, tableId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.updateTable(barId, tableId, dto)).rejects.toThrow(ErrorCodes.TABLE_NOT_FOUND);
    });

    it('should fail if the table belongs to a different bar', async () => {
      repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-other' });

      await expect(service.updateTable(barId, tableId, dto)).rejects.toThrow(NotFoundException);
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

      const result = await service.updateTable(barId, tableId, dto);

      expect(repository.update).toHaveBeenCalledWith(tableId, dto);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_UPDATED, result);
    });
  });

  describe('deleteTable', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');

    it('should fail if the table does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteTable(barId, tableId)).rejects.toThrow(NotFoundException);
    });

    it('should delete the table and emit socket event', async () => {
      repository.findById.mockResolvedValue({ id: 'table-1', barId: 'bar-1' });
      repository.delete.mockResolvedValue(undefined);

      await service.deleteTable(barId, tableId);

      expect(repository.delete).toHaveBeenCalledWith(tableId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_DELETED, { id: tableId });
    });
  });
});
