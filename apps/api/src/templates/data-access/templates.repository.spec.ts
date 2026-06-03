import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PrismaService } from '../../core';
import { TemplatesRepository } from './templates.repository';

describe('TemplatesRepository', () => {
  let repository: TemplatesRepository;
  let prisma: {
    dbCategoryTemplate: {
      findMany: Mock;
      findUnique: Mock;
      findFirst: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
    dbProductTemplate: {
      findMany: Mock;
      findUnique: Mock;
      findFirst: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
    dbCategory: {
      createMany: Mock;
      findMany: Mock;
    };
    dbProduct: {
      createMany: Mock;
    };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbCategoryTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      dbProductTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      dbCategory: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      dbProduct: {
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
    it('findAllCategoryTemplates should call prisma.dbCategoryTemplate.findMany', async () => {
      prisma.dbCategoryTemplate.findMany.mockResolvedValue([]);
      await repository.findAllCategoryTemplates();
      expect(prisma.dbCategoryTemplate.findMany).toHaveBeenCalledWith({
        include: { products: true },
      });
    });

    it('findCategoryTemplateById should call prisma.dbCategoryTemplate.findUnique', async () => {
      prisma.dbCategoryTemplate.findUnique.mockResolvedValue({});
      await repository.findCategoryTemplateById('1');
      expect(prisma.dbCategoryTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { products: true },
      });
    });

    it('createCategoryTemplate should call prisma.dbCategoryTemplate.create', async () => {
      const data = { name: 'Test' };
      await repository.createCategoryTemplate(data);
      expect(prisma.dbCategoryTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('updateCategoryTemplate should call prisma.dbCategoryTemplate.update', async () => {
      const data = { name: 'Updated' };
      await repository.updateCategoryTemplate('1', data);
      expect(prisma.dbCategoryTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
    });

    it('deleteCategoryTemplate should call prisma.dbCategoryTemplate.delete', async () => {
      await repository.deleteCategoryTemplate('1');
      expect(prisma.dbCategoryTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('findCategoryTemplateByName should call prisma.dbCategoryTemplate.findFirst', async () => {
      prisma.dbCategoryTemplate.findFirst.mockResolvedValue(null);
      await repository.findCategoryTemplateByName('name');
      expect(prisma.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'name' },
      });
    });

    it('upsertCategoryTemplate should create if not exists', async () => {
      prisma.dbCategoryTemplate.findFirst.mockResolvedValue(null);
      prisma.dbCategoryTemplate.create.mockResolvedValue({ id: '1', name: 'name', icon: 'icon' });

      const result = await repository.upsertCategoryTemplate('name', 'icon');

      expect(prisma.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(prisma.dbCategoryTemplate.create).toHaveBeenCalledWith({ data: { name: 'name', icon: 'icon' } });
      expect(result).toEqual({ id: '1', name: 'name', icon: 'icon' });
    });

    it('upsertCategoryTemplate should update icon if exists and different', async () => {
      prisma.dbCategoryTemplate.findFirst.mockResolvedValue({ id: '1', name: 'name', icon: 'old' });
      prisma.dbCategoryTemplate.update.mockResolvedValue({ id: '1', name: 'name', icon: 'new' });

      const result = await repository.upsertCategoryTemplate('name', 'new');

      expect(prisma.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(prisma.dbCategoryTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { icon: 'new' },
      });
      expect(result).toEqual({ id: '1', name: 'name', icon: 'new' });
    });

    it('upsertCategoryTemplate should return existing if exists and same icon', async () => {
      prisma.dbCategoryTemplate.findFirst.mockResolvedValue({ id: '1', name: 'name', icon: 'same' });

      const result = await repository.upsertCategoryTemplate('name', 'same');

      expect(prisma.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(prisma.dbCategoryTemplate.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'name', icon: 'same' });
    });
  });

  describe('ProductTemplate Operations', () => {
    it('findAllProductTemplates should call prisma.dbProductTemplate.findMany', async () => {
      prisma.dbProductTemplate.findMany.mockResolvedValue([]);
      await repository.findAllProductTemplates();
      expect(prisma.dbProductTemplate.findMany).toHaveBeenCalledWith({
        include: { category: true },
      });
    });

    it('findProductTemplateById should call prisma.dbProductTemplate.findUnique', async () => {
      prisma.dbProductTemplate.findUnique.mockResolvedValue({});
      await repository.findProductTemplateById('1');
      expect(prisma.dbProductTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { category: true },
      });
    });

    it('createProductTemplate should call prisma.dbProductTemplate.create', async () => {
      const data = { name: 'Product', price: 10, categoryId: 'cat1' };
      await repository.createProductTemplate(data);
      expect(prisma.dbProductTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('updateProductTemplate should call prisma.dbProductTemplate.update', async () => {
      const data = { name: 'Updated' };
      await repository.updateProductTemplate('1', data);
      expect(prisma.dbProductTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
    });

    it('deleteProductTemplate should call prisma.dbProductTemplate.delete', async () => {
      await repository.deleteProductTemplate('1');
      expect(prisma.dbProductTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('findProductTemplateByNameAndCategoryId should call prisma.dbProductTemplate.findFirst', async () => {
      prisma.dbProductTemplate.findFirst.mockResolvedValue(null);
      await repository.findProductTemplateByNameAndCategoryId('name', 'cat1');
      expect(prisma.dbProductTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'name', categoryId: 'cat1' },
      });
    });

    it('upsertProductTemplate should create if not exists', async () => {
      prisma.dbProductTemplate.findFirst.mockResolvedValue(null);
      prisma.dbProductTemplate.create.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 10, 'cat1');

      expect(prisma.dbProductTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(prisma.dbProductTemplate.create).toHaveBeenCalledWith({
        data: { name: 'name', price: 10, categoryId: 'cat1' },
      });
      expect(result).toEqual({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
    });

    it('upsertProductTemplate should update price if exists and different', async () => {
      prisma.dbProductTemplate.findFirst.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
      prisma.dbProductTemplate.update.mockResolvedValue({ id: 'p1', name: 'name', price: 15, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 15, 'cat1');

      expect(prisma.dbProductTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(prisma.dbProductTemplate.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { price: 15 },
      });
      expect(result).toEqual({ id: 'p1', name: 'name', price: 15, categoryId: 'cat1' });
    });

    it('upsertProductTemplate should return existing if exists and same price', async () => {
      prisma.dbProductTemplate.findFirst.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 10, 'cat1');

      expect(prisma.dbProductTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(prisma.dbProductTemplate.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
    });
  });

  describe('Import Operations', () => {
    it('findCategoryTemplatesByIds should call prisma.dbCategoryTemplate.findMany with in filter', async () => {
      prisma.dbCategoryTemplate.findMany.mockResolvedValue([]);
      await repository.findCategoryTemplatesByIds(['1', '2']);
      expect(prisma.dbCategoryTemplate.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
        include: { products: true },
      });
    });

    it('createManyCategories should call prisma.dbCategory.createMany', async () => {
      const data = [{ barId: 'bar1', name: 'Cat', icon: 'icon' }];
      await repository.createManyCategories(data);
      expect(prisma.dbCategory.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });

    it('findCategoriesByBarIdAndNames should call prisma.dbCategory.findMany', async () => {
      prisma.dbCategory.findMany.mockResolvedValue([]);
      await repository.findCategoriesByBarIdAndNames('bar1', ['Cat']);
      expect(prisma.dbCategory.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar1', name: { in: ['Cat'] } },
      });
    });

    it('createManyProducts should call prisma.dbProduct.createMany', async () => {
      const data = [{ categoryId: 'cat1', name: 'Prod', price: 10, currentStock: 0, minStockAlert: 0 }];
      await repository.createManyProducts(data);
      expect(prisma.dbProduct.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });
  });
});
