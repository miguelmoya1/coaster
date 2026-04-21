import { asBarId, asCategoryId, asProductId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PrismaService } from '../../core';
import { ProductsRepository } from './products.repository';

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let prisma: {
    category: { findUnique: Mock };
    product: { create: Mock; update: Mock; findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      category: { findUnique: vi.fn() },
      product: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ProductsRepository>(ProductsRepository);
    prisma = module.get(PrismaService);
  });

  describe('checkCategoryBelongsToBar', () => {
    it('debería retornar true si la categoría pertenece al bar', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      prisma.category.findUnique.mockResolvedValue({ id: categoryId, barId });

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(result).toBe(true);
    });

    it('debería retornar false si la categoría no pertenece al bar', async () => {
      const categoryId = asCategoryId('cat-1');
      const barId = asBarId('bar-1');
      prisma.category.findUnique.mockResolvedValue({ id: categoryId, barId: 'otro-bar' });

      const result = await repository.checkCategoryBelongsToBar(categoryId, barId);

      expect(result).toBe(false);
    });

    it('debería retornar false si la categoría no existe', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const result = await repository.checkCategoryBelongsToBar(asCategoryId('cat-1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('debería crear el producto conectado a la categoría', async () => {
      const categoryId = asCategoryId('cat-1');
      const createData = { name: 'Cerveza', currentStock: 10, minStockAlert: 5 };
      prisma.product.create.mockResolvedValue({ id: 'prod-1', ...createData, categoryId });

      const result = await repository.create(categoryId, createData);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          category: { connect: { id: categoryId } },
        },
      });
      expect(result).toEqual({ id: 'prod-1', ...createData, categoryId });
    });
  });

  describe('update', () => {
    it('debería actualizar el producto por id', async () => {
      const productId = asProductId('prod-1');
      const updateData = { currentStock: 20 };
      prisma.product.update.mockResolvedValue({ id: productId, ...updateData });

      const result = await repository.update(productId, updateData);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { ...updateData },
      });
      expect(result).toEqual({ id: productId, ...updateData });
    });
  });

  describe('findByBarId', () => {
    it('debería buscar productos filtrando por el bar de la categoría', async () => {
      const barId = asBarId('bar-1');
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'A' }]);

      const result = await repository.findByBarId(barId);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { category: { barId } },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([{ id: 'prod-1', name: 'A' }]);
    });
  });
});
