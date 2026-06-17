import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsReadRepository } from './products.read.repository';
import { DbService } from '../../db';
import { asBarId, asCategoryId } from '../../core';

describe('ProductsReadRepository', () => {
  let repository: ProductsReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsReadRepository,
        {
          provide: DbService,
          useValue: {
            dbCategory: {
              findUnique: vi.fn(),
            },
            dbProduct: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ProductsReadRepository>(ProductsReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('checkCategoryBelongsToBar', () => {
    it('should return true if category belongs to bar', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      vi.mocked(dbService.dbCategory.findUnique).mockResolvedValue({ id: categoryId, barId } as any);

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);

      expect(dbService.dbCategory.findUnique).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(result).toBe(true);
    });

    it('should return false if category does not belong to bar', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      vi.mocked(dbService.dbCategory.findUnique).mockResolvedValue({ id: categoryId, barId: 'bar-2' } as any);

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);
      expect(result).toBe(false);
    });

    it('should return false if category not found', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      vi.mocked(dbService.dbCategory.findUnique).mockResolvedValue(null as any);

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);
      expect(result).toBe(false);
    });
  });

  describe('findByBarId', () => {
    it('should call dbProduct.findMany with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = [{ id: 'prod-1' }];
      vi.mocked(dbService.dbProduct.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByBarId(barId);

      expect(dbService.dbProduct.findMany).toHaveBeenCalledWith({
        where: { category: { barId } },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
