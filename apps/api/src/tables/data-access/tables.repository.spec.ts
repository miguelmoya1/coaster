import { asBarId, asTableId } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbService } from '../../db';;
import { TablesRepository } from './tables.repository';

describe('TablesRepository', () => {
  let repository: TablesRepository;
  let db: {
    dbTable: { findMany: Mock; findUnique: Mock; create: Mock; update: Mock; delete: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbTable: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TablesRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<TablesRepository>(TablesRepository);
    db = module.get(DbService);
  });

  describe('findByBarId', () => {
    it('should find tables by bar id ordered by name', async () => {
      const barId = asBarId('bar-1');
      db.dbTable.findMany.mockResolvedValue([{ id: 'table-1', name: 'Mesa 1' }]);

      const result = await repository.findByBarId(barId);

      expect(db.dbTable.findMany).toHaveBeenCalledWith({
        where: { barId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([{ id: 'table-1', name: 'Mesa 1' }]);
    });
  });

  describe('findById', () => {
    it('should find a table by id', async () => {
      const tableId = asTableId('table-1');
      db.dbTable.findUnique.mockResolvedValue({ id: 'table-1', name: 'Mesa 1' });

      const result = await repository.findById(tableId);

      expect(db.dbTable.findUnique).toHaveBeenCalledWith({
        where: { id: tableId },
      });
      expect(result).toEqual({ id: 'table-1', name: 'Mesa 1' });
    });

    it('should return null if table not found', async () => {
      db.dbTable.findUnique.mockResolvedValue(null);

      const result = await repository.findById(asTableId('nonexistent'));

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a table connected to the bar', async () => {
      const barId = asBarId('bar-1');
      const data = { name: 'Mesa 1' };
      db.dbTable.create.mockResolvedValue({ id: 'table-1', ...data, barId });

      const result = await repository.create(barId, data);

      expect(db.dbTable.create).toHaveBeenCalledWith({
        data: {
          ...data,
          bar: { connect: { id: barId } },
        },
      });
      expect(result).toEqual({ id: 'table-1', ...data, barId });
    });
  });

  describe('update', () => {
    it('should update the table by id', async () => {
      const tableId = asTableId('table-1');
      const updateData = { name: 'Mesa Actualizada' };
      db.dbTable.update.mockResolvedValue({ id: tableId, ...updateData });

      const result = await repository.update(tableId, updateData);

      expect(db.dbTable.update).toHaveBeenCalledWith({
        where: { id: tableId },
        data: updateData,
      });
      expect(result).toEqual({ id: tableId, ...updateData });
    });
  });

  describe('delete', () => {
    it('should delete the table by id', async () => {
      const tableId = asTableId('table-1');
      db.dbTable.delete.mockResolvedValue({ id: tableId });

      await repository.delete(tableId);

      expect(db.dbTable.delete).toHaveBeenCalledWith({
        where: { id: tableId },
      });
    });
  });
});
