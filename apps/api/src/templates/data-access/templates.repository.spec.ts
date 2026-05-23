import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PrismaService } from '../../core';
import { TemplatesRepository } from './templates.repository';

describe('TemplatesRepository', () => {
  let repository: TemplatesRepository;
  let prisma: {
    categoryTemplate: {
      findMany: Mock;
      findUnique: Mock;
      findFirst: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
    productTemplate: {
      findMany: Mock;
      findUnique: Mock;
      findFirst: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
    category: {
      createMany: Mock;
      findMany: Mock;
    };
    product: {
      createMany: Mock;
    };
  };

  beforeEach(async () => {
    const mockPrisma = {
      categoryTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      productTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      product: {
        createMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<TemplatesRepository>(TemplatesRepository);
    prisma = module.get(PrismaService);
  });

  describe('CategoryTemplate Operations', () => {
    it('findAllCategoryTemplates should call prisma.categoryTemplate.findMany', async () => {
      prisma.categoryTemplate.findMany.mockResolvedValue([]);
      await repository.findAllCategoryTemplates();
      expect(prisma.categoryTemplate.findMany).toHaveBeenCalledWith({
        include: { products: true },
      });
    });

    it('findCategoryTemplateById should call prisma.categoryTemplate.findUnique', async () => {
      prisma.categoryTemplate.findUnique.mockResolvedValue({});
      await repository.findCategoryTemplateById('1');
      expect(prisma.categoryTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { products: true },
      });
    });

    it('createCategoryTemplate should call prisma.categoryTemplate.create', async () => {
      const data = { name: 'Test' };
      await repository.createCategoryTemplate(data);
      expect(prisma.categoryTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('updateCategoryTemplate should call prisma.categoryTemplate.update', async () => {
      const data = { name: 'Updated' };
      await repository.updateCategoryTemplate('1', data);
      expect(prisma.categoryTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
    });

    it('deleteCategoryTemplate should call prisma.categoryTemplate.delete', async () => {
      await repository.deleteCategoryTemplate('1');
      expect(prisma.categoryTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('findCategoryTemplateByName should call prisma.categoryTemplate.findFirst', async () => {
      prisma.categoryTemplate.findFirst.mockResolvedValue(null);
      await repository.findCategoryTemplateByName('name');
      expect(prisma.categoryTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'name' },
      });
    });

    it('upsertCategoryTemplate should create if not exists', async () => {
      prisma.categoryTemplate.findFirst.mockResolvedValue(null);
      prisma.categoryTemplate.create.mockResolvedValue({ id: '1', name: 'name', icon: 'icon' });

      const result = await repository.upsertCategoryTemplate('name', 'icon');

      expect(prisma.categoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(prisma.categoryTemplate.create).toHaveBeenCalledWith({ data: { name: 'name', icon: 'icon' } });
      expect(result).toEqual({ id: '1', name: 'name', icon: 'icon' });
    });

    it('upsertCategoryTemplate should update icon if exists and different', async () => {
      prisma.categoryTemplate.findFirst.mockResolvedValue({ id: '1', name: 'name', icon: 'old' });
      prisma.categoryTemplate.update.mockResolvedValue({ id: '1', name: 'name', icon: 'new' });

      const result = await repository.upsertCategoryTemplate('name', 'new');

      expect(prisma.categoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(prisma.categoryTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { icon: 'new' },
      });
      expect(result).toEqual({ id: '1', name: 'name', icon: 'new' });
    });

    it('upsertCategoryTemplate should return existing if exists and same icon', async () => {
      prisma.categoryTemplate.findFirst.mockResolvedValue({ id: '1', name: 'name', icon: 'same' });

      const result = await repository.upsertCategoryTemplate('name', 'same');

      expect(prisma.categoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(prisma.categoryTemplate.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'name', icon: 'same' });
    });
  });

  describe('ProductTemplate Operations', () => {
    it('findAllProductTemplates should call prisma.productTemplate.findMany', async () => {
      prisma.productTemplate.findMany.mockResolvedValue([]);
      await repository.findAllProductTemplates();
      expect(prisma.productTemplate.findMany).toHaveBeenCalledWith({
        include: { category: true },
      });
    });

    it('findProductTemplateById should call prisma.productTemplate.findUnique', async () => {
      prisma.productTemplate.findUnique.mockResolvedValue({});
      await repository.findProductTemplateById('1');
      expect(prisma.productTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { category: true },
      });
    });

    it('createProductTemplate should call prisma.productTemplate.create', async () => {
      const data = { name: 'Product', price: 10, categoryId: 'cat1' };
      await repository.createProductTemplate(data);
      expect(prisma.productTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('updateProductTemplate should call prisma.productTemplate.update', async () => {
      const data = { name: 'Updated' };
      await repository.updateProductTemplate('1', data);
      expect(prisma.productTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
    });

    it('deleteProductTemplate should call prisma.productTemplate.delete', async () => {
      await repository.deleteProductTemplate('1');
      expect(prisma.productTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('findProductTemplateByNameAndCategoryId should call prisma.productTemplate.findFirst', async () => {
      prisma.productTemplate.findFirst.mockResolvedValue(null);
      await repository.findProductTemplateByNameAndCategoryId('name', 'cat1');
      expect(prisma.productTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'name', categoryId: 'cat1' },
      });
    });

    it('upsertProductTemplate should create if not exists', async () => {
      prisma.productTemplate.findFirst.mockResolvedValue(null);
      prisma.productTemplate.create.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 10, 'cat1');

      expect(prisma.productTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(prisma.productTemplate.create).toHaveBeenCalledWith({ data: { name: 'name', price: 10, categoryId: 'cat1' } });
      expect(result).toEqual({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
    });

    it('upsertProductTemplate should update price if exists and different', async () => {
      prisma.productTemplate.findFirst.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
      prisma.productTemplate.update.mockResolvedValue({ id: 'p1', name: 'name', price: 15, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 15, 'cat1');

      expect(prisma.productTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(prisma.productTemplate.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { price: 15 },
      });
      expect(result).toEqual({ id: 'p1', name: 'name', price: 15, categoryId: 'cat1' });
    });

    it('upsertProductTemplate should return existing if exists and same price', async () => {
      prisma.productTemplate.findFirst.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 10, 'cat1');

      expect(prisma.productTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(prisma.productTemplate.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
    });
  });

  describe('Import Operations', () => {
    it('findCategoryTemplatesByIds should call prisma.categoryTemplate.findMany with in filter', async () => {
      prisma.categoryTemplate.findMany.mockResolvedValue([]);
      await repository.findCategoryTemplatesByIds(['1', '2']);
      expect(prisma.categoryTemplate.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
        include: { products: true },
      });
    });

    it('createManyCategories should call prisma.category.createMany', async () => {
      const data = [{ barId: 'bar1', name: 'Cat', icon: 'icon' }];
      await repository.createManyCategories(data);
      expect(prisma.category.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });

    it('findCategoriesByBarIdAndNames should call prisma.category.findMany', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      await repository.findCategoriesByBarIdAndNames('bar1', ['Cat']);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar1', name: { in: ['Cat'] } },
      });
    });

    it('createManyProducts should call prisma.product.createMany', async () => {
      const data = [{ categoryId: 'cat1', name: 'Prod', price: 10, currentStock: 0, minStockAlert: 0 }];
      await repository.createManyProducts(data);
      expect(prisma.product.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });
  });
});


