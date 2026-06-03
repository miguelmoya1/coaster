import { asBarId, asCategoryId, asProductId } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PrismaService } from '../../core';
import { ProductsRepository } from './products.repository';

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let prisma: {
    dbCategory: { findUnique: Mock };
    dbProduct: { create: Mock; update: Mock; findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbCategory: { findUnique: vi.fn() },
      dbProduct: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ProductsRepository>(ProductsRepository);
    prisma = module.get(PrismaService);
  });

  describe('checkCategoryBelongsToBar', () => {
    it('should return true if the category belongs to the bar', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      prisma.dbCategory.findUnique.mockResolvedValue({ id: categoryId, barId });

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);

      expect(prisma.dbCategory.findUnique).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(result).toBe(true);
    });

    it('should return false if the category does not belong to the bar', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      prisma.dbCategory.findUnique.mockResolvedValue({ id: categoryId, barId: 'otro-bar' });

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);

      expect(result).toBe(false);
    });

    it('should return false if the category does not exist', async () => {
      prisma.dbCategory.findUnique.mockResolvedValue(null);

      const result = await repository.checkCategoryBelongsToBar(asCategoryId('cat-1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create the product connected to the category', async () => {
      const categoryId = asCategoryId('cat-1');
      const createData = { name: 'Cerveza', currentStock: 10, minStockAlert: 5 };
      prisma.dbProduct.create.mockResolvedValue({ id: 'prod-1', ...createData, categoryId });

      const result = await repository.create(categoryId, createData);

      expect(prisma.dbProduct.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          price: 0,
          category: { connect: { id: categoryId } },
        },
      });
      expect(result).toEqual({ id: 'prod-1', ...createData, categoryId });
    });
  });

  describe('update', () => {
    it('should update the product by id', async () => {
      const productId = asProductId('prod-1');
      const updateData = { currentStock: 20, price: 1 };
      prisma.dbProduct.update.mockResolvedValue({ id: productId, ...updateData });

      const result = await repository.update(productId, updateData);

      expect(prisma.dbProduct.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateData,
      });
      expect(result).toEqual({ id: productId, ...updateData });
    });

    it('should not overwrite the price to 0 when price is not provided in updateData', async () => {
      const productId = asProductId('prod-1');
      const updateData = { currentStock: 15 };
      prisma.dbProduct.update.mockResolvedValue({ id: productId, currentStock: 15, price: 1200 });

      const result = await repository.update(productId, updateData);

      expect(prisma.dbProduct.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { currentStock: 15 },
      });
      expect(result.price).toBe(1200);
    });
  });

  describe('findByBarId', () => {
    it('should find products filtering by the category bar', async () => {
      const barId = asBarId('bar-1');
      prisma.dbProduct.findMany.mockResolvedValue([{ id: 'prod-1', name: 'A' }]);

      const result = await repository.findByBarId(barId);

      expect(prisma.dbProduct.findMany).toHaveBeenCalledWith({
        where: { category: { barId } },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([{ id: 'prod-1', name: 'A' }]);
    });
  });
});
