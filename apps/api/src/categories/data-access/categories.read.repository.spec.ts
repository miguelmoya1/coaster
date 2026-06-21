import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../core';
import { DbService } from '../../core/db';
import { CategoriesReadRepository } from './categories.read.repository';

describe('CategoriesReadRepository', () => {
  let repository: CategoriesReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesReadRepository,
        {
          provide: DbService,
          useValue: {
            dbCategory: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<CategoriesReadRepository>(CategoriesReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByBarId', () => {
    it('should call dbCategory.findMany with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = [{ id: 'cat-1' }];
      vi.mocked(dbService.dbCategory.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByBarId(barId);

      expect(dbService.dbCategory.findMany).toHaveBeenCalledWith({
        where: { barId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
