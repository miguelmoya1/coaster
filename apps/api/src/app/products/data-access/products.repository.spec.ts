import { asBarId, asCategoryId, asProductId, ProductStatus } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core';
import { ProductsRepository } from './products.repository';

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let prisma: {
    category: { findUnique: jest.Mock };
    product: { create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      category: { findUnique: jest.fn() },
      product: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ProductsRepository>(ProductsRepository);
    prisma = module.get(PrismaService);
  });

  describe('checkCategoryBelongsToBar', () => {
    it('debería devolver true si la categoría pertenece al bar', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', barId: 'bar-1' });

      const result = await repository.checkCategoryBelongsToBar(asCategoryId('cat-1'), asBarId('bar-1'));

      expect(result).toBe(true);
    });

    it('debería devolver false si la categoría no existe o no pertenece', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const result = await repository.checkCategoryBelongsToBar(asCategoryId('cat-1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('debería crear un producto', async () => {
      prisma.product.create.mockResolvedValue({ id: 'prod-1' });

      const result = await repository.create(asCategoryId('cat-1'), { name: 'Coca Cola', status: ProductStatus.OK });

      expect(prisma.product.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'prod-1' });
    });
  });

  describe('updateStatus', () => {
    it('debería actualizar el estado del producto', async () => {
      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        status: 'OUT_OF_STOCK',
      });

      const result = await repository.updateStatus(asProductId('prod-1'), { status: ProductStatus.OUT_OF_STOCK });

      expect(prisma.product.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 'prod-1', status: 'OUT_OF_STOCK' });
    });
  });

  describe('findByBarId', () => {
    it('debería buscar los productos asociados a la categoría de un bar', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);

      const result = await repository.findByBarId(asBarId('bar-1'));

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { category: { barId: 'bar-1' } },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([{ id: 'prod-1' }]);
    });
  });
});
