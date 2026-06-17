import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsWriteRepository } from './products.write.repository';
import { DbService } from '../../db';
import { asCategoryId, asProductId } from '../../core';

describe('ProductsWriteRepository', () => {
  let repository: ProductsWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbProduct: {
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ProductsWriteRepository>(ProductsWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call dbProduct.create with correct parameters', async () => {
      const categoryId = asCategoryId('cat-1');
      const createProductDto = { name: 'Product 1' };
      const expectedResult = { id: 'prod-1', categoryId, ...createProductDto };
      vi.mocked(dbService.dbProduct.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(categoryId, createProductDto as any);

      expect(dbService.dbProduct.create).toHaveBeenCalledWith({
        data: {
          ...createProductDto,
          price: 0,
          categoryId,
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should call dbProduct.create with provided price', async () => {
      const categoryId = asCategoryId('cat-1');
      const createProductDto = { name: 'Product 1', price: 10 };
      const expectedResult = { id: 'prod-1', categoryId, ...createProductDto };
      vi.mocked(dbService.dbProduct.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(categoryId, createProductDto as any);

      expect(dbService.dbProduct.create).toHaveBeenCalledWith({
        data: {
          ...createProductDto,
          price: 10,
          categoryId,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call dbProduct.update with correct parameters', async () => {
      const productId = asProductId('prod-1');
      const updateData = { name: 'Updated Product' };
      const expectedResult = { id: 'prod-1', ...updateData };
      vi.mocked(dbService.dbProduct.update).mockResolvedValue(expectedResult as any);

      const result = await repository.update(productId, updateData as any);

      expect(dbService.dbProduct.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateData,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call dbProduct.delete with correct parameters', async () => {
      const productId = asProductId('prod-1');
      const expectedResult = { id: 'prod-1' };
      vi.mocked(dbService.dbProduct.delete).mockResolvedValue(expectedResult as any);

      const result = await repository.delete(productId);

      expect(dbService.dbProduct.delete).toHaveBeenCalledWith({
        where: { id: productId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
