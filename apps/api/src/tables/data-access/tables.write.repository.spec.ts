import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TablesWriteRepository } from './tables.write.repository';
import { DbService } from '../../db';
import { asBarId, asTableId } from '../../core';

describe('TablesWriteRepository', () => {
  let repository: TablesWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbTable: {
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<TablesWriteRepository>(TablesWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call dbTable.create with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const data = { name: 'Table 1' };
      const expectedResult = { id: 'table-1', barId, ...data };
      vi.mocked(dbService.dbTable.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(barId, data);

      expect(dbService.dbTable.create).toHaveBeenCalledWith({
        data: { ...data, barId },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call dbTable.update with correct parameters', async () => {
      const tableId = asTableId('table-1');
      const data = { name: 'Updated Table 1' };
      const expectedResult = { id: 'table-1', ...data };
      vi.mocked(dbService.dbTable.update).mockResolvedValue(expectedResult as any);

      const result = await repository.update(tableId, data as any);

      expect(dbService.dbTable.update).toHaveBeenCalledWith({
        where: { id: tableId },
        data,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call dbTable.delete with correct parameters', async () => {
      const tableId = asTableId('table-1');
      const expectedResult = { id: 'table-1' };
      vi.mocked(dbService.dbTable.delete).mockResolvedValue(expectedResult as any);

      const result = await repository.delete(tableId);

      expect(dbService.dbTable.delete).toHaveBeenCalledWith({
        where: { id: tableId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
