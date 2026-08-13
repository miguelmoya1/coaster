import { asEstablishmentId, asCategoryId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsReadRepository } from './products.read.repository';

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

  describe('checkCategoryBelongsToEstablishment', () => {
    it('should return true if category belongs to establishment', async () => {
      const categoryId = asCategoryId('cat-1');
      const establishmentId = asEstablishmentId('establishment-1');
      vi.mocked(dbService.dbCategory.findUnique).mockResolvedValue({ id: categoryId, establishmentId } as any);

      const result = await repository.checkCategoryBelongsToEstablishment(categoryId, establishmentId);

      expect(dbService.dbCategory.findUnique).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(result).toBe(true);
    });

    it('should return false if category does not belong to establishment', async () => {
      const categoryId = asCategoryId('cat-1');
      const establishmentId = asEstablishmentId('establishment-1');
      vi.mocked(dbService.dbCategory.findUnique).mockResolvedValue({
        id: categoryId,
        establishmentId: 'establishment-2',
      } as any);

      const result = await repository.checkCategoryBelongsToEstablishment(categoryId, establishmentId);
      expect(result).toBe(false);
    });

    it('should return false if category not found', async () => {
      const categoryId = asCategoryId('cat-1');
      const establishmentId = asEstablishmentId('establishment-1');
      vi.mocked(dbService.dbCategory.findUnique).mockResolvedValue(null as any);

      const result = await repository.checkCategoryBelongsToEstablishment(categoryId, establishmentId);
      expect(result).toBe(false);
    });
  });

  describe('findByEstablishmentId', () => {
    it('should call dbProduct.findMany with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const expectedResult = [{ id: 'prod-1' }];
      vi.mocked(dbService.dbProduct.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByEstablishmentId(establishmentId);

      expect(dbService.dbProduct.findMany).toHaveBeenCalledWith({
        where: { category: { establishmentId, deletedAt: null }, deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
