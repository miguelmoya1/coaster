import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asTableId } from '../../core';
import { DbService } from '../../core/db';
import { TablesReadRepository } from './tables.read.repository';

describe('TablesReadRepository', () => {
  let repository: TablesReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesReadRepository,
        {
          provide: DbService,
          useValue: {
            dbTable: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<TablesReadRepository>(TablesReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByBarId', () => {
    it('should call dbTable.findMany with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = [{ id: 'table-1' }];
      vi.mocked(dbService.dbTable.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByBarId(barId);

      expect(dbService.dbTable.findMany).toHaveBeenCalledWith({
        where: { barId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should call dbTable.findUnique with correct parameters', async () => {
      const tableId = asTableId('table-1');
      const expectedResult = { id: 'table-1' };
      vi.mocked(dbService.dbTable.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findById(tableId);

      expect(dbService.dbTable.findUnique).toHaveBeenCalledWith({
        where: { id: tableId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
