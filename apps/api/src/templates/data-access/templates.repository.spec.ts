import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbService } from '../../db';
import { TemplatesRepository } from './templates.repository';

describe('TemplatesRepository', () => {
  let repository: TemplatesRepository;
  let db: {
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
      providers: [TemplatesRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<TemplatesRepository>(TemplatesRepository);
    db = module.get(DbService);
  });

  describe('CategoryTemplate Operations', () => {
    it('findAllCategoryTemplates should call db.dbCategoryTemplate.findMany', async () => {
      db.dbCategoryTemplate.findMany.mockResolvedValue([]);
      await repository.findAllCategoryTemplates();
      expect(db.dbCategoryTemplate.findMany).toHaveBeenCalledWith({
        include: { products: true },
      });
    });

    it('findCategoryTemplateById should call db.dbCategoryTemplate.findUnique', async () => {
      db.dbCategoryTemplate.findUnique.mockResolvedValue({});
      await repository.findCategoryTemplateById('1');
      expect(db.dbCategoryTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { products: true },
      });
    });

    it('createCategoryTemplate should call db.dbCategoryTemplate.create', async () => {
      const data = { name: 'Test' };
      await repository.createCategoryTemplate(data);
      expect(db.dbCategoryTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('updateCategoryTemplate should call db.dbCategoryTemplate.update', async () => {
      const data = { name: 'Updated' };
      await repository.updateCategoryTemplate('1', data);
      expect(db.dbCategoryTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
    });

    it('deleteCategoryTemplate should call db.dbCategoryTemplate.delete', async () => {
      await repository.deleteCategoryTemplate('1');
      expect(db.dbCategoryTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('findCategoryTemplateByName should call db.dbCategoryTemplate.findFirst', async () => {
      db.dbCategoryTemplate.findFirst.mockResolvedValue(null);
      await repository.findCategoryTemplateByName('name');
      expect(db.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'name' },
      });
    });

    it('upsertCategoryTemplate should create if not exists', async () => {
      db.dbCategoryTemplate.findFirst.mockResolvedValue(null);
      db.dbCategoryTemplate.create.mockResolvedValue({ id: '1', name: 'name', icon: 'icon' });

      const result = await repository.upsertCategoryTemplate('name', 'icon');

      expect(db.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(db.dbCategoryTemplate.create).toHaveBeenCalledWith({ data: { name: 'name', icon: 'icon' } });
      expect(result).toEqual({ id: '1', name: 'name', icon: 'icon' });
    });

    it('upsertCategoryTemplate should update icon if exists and different', async () => {
      db.dbCategoryTemplate.findFirst.mockResolvedValue({ id: '1', name: 'name', icon: 'old' });
      db.dbCategoryTemplate.update.mockResolvedValue({ id: '1', name: 'name', icon: 'new' });

      const result = await repository.upsertCategoryTemplate('name', 'new');

      expect(db.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(db.dbCategoryTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { icon: 'new' },
      });
      expect(result).toEqual({ id: '1', name: 'name', icon: 'new' });
    });

    it('upsertCategoryTemplate should return existing if exists and same icon', async () => {
      db.dbCategoryTemplate.findFirst.mockResolvedValue({ id: '1', name: 'name', icon: 'same' });

      const result = await repository.upsertCategoryTemplate('name', 'same');

      expect(db.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name' } });
      expect(db.dbCategoryTemplate.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'name', icon: 'same' });
    });
  });

  describe('ProductTemplate Operations', () => {
    it('findAllProductTemplates should call db.dbProductTemplate.findMany', async () => {
      db.dbProductTemplate.findMany.mockResolvedValue([]);
      await repository.findAllProductTemplates();
      expect(db.dbProductTemplate.findMany).toHaveBeenCalledWith({
        include: { category: true },
      });
    });

    it('findProductTemplateById should call db.dbProductTemplate.findUnique', async () => {
      db.dbProductTemplate.findUnique.mockResolvedValue({});
      await repository.findProductTemplateById('1');
      expect(db.dbProductTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { category: true },
      });
    });

    it('createProductTemplate should call db.dbProductTemplate.create', async () => {
      const data = { name: 'Product', price: 10, categoryId: 'cat1' };
      await repository.createProductTemplate(data);
      expect(db.dbProductTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('updateProductTemplate should call db.dbProductTemplate.update', async () => {
      const data = { name: 'Updated' };
      await repository.updateProductTemplate('1', data);
      expect(db.dbProductTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
    });

    it('deleteProductTemplate should call db.dbProductTemplate.delete', async () => {
      await repository.deleteProductTemplate('1');
      expect(db.dbProductTemplate.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('findProductTemplateByNameAndCategoryId should call db.dbProductTemplate.findFirst', async () => {
      db.dbProductTemplate.findFirst.mockResolvedValue(null);
      await repository.findProductTemplateByNameAndCategoryId('name', 'cat1');
      expect(db.dbProductTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'name', categoryId: 'cat1' },
      });
    });

    it('upsertProductTemplate should create if not exists', async () => {
      db.dbProductTemplate.findFirst.mockResolvedValue(null);
      db.dbProductTemplate.create.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 10, 'cat1');

      expect(db.dbProductTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(db.dbProductTemplate.create).toHaveBeenCalledWith({
        data: { name: 'name', price: 10, categoryId: 'cat1' },
      });
      expect(result).toEqual({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
    });

    it('upsertProductTemplate should update price if exists and different', async () => {
      db.dbProductTemplate.findFirst.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
      db.dbProductTemplate.update.mockResolvedValue({ id: 'p1', name: 'name', price: 15, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 15, 'cat1');

      expect(db.dbProductTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(db.dbProductTemplate.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { price: 15 },
      });
      expect(result).toEqual({ id: 'p1', name: 'name', price: 15, categoryId: 'cat1' });
    });

    it('upsertProductTemplate should return existing if exists and same price', async () => {
      db.dbProductTemplate.findFirst.mockResolvedValue({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });

      const result = await repository.upsertProductTemplate('name', 10, 'cat1');

      expect(db.dbProductTemplate.findFirst).toHaveBeenCalledWith({ where: { name: 'name', categoryId: 'cat1' } });
      expect(db.dbProductTemplate.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'p1', name: 'name', price: 10, categoryId: 'cat1' });
    });
  });

  describe('Import Operations', () => {
    it('findCategoryTemplatesByIds should call db.dbCategoryTemplate.findMany with in filter', async () => {
      db.dbCategoryTemplate.findMany.mockResolvedValue([]);
      await repository.findCategoryTemplatesByIds(['1', '2']);
      expect(db.dbCategoryTemplate.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
        include: { products: true },
      });
    });

    it('createManyCategories should call db.dbCategory.createMany', async () => {
      const data = [{ barId: 'bar1', name: 'Cat', icon: 'icon' }];
      await repository.createManyCategories(data);
      expect(db.dbCategory.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });

    it('findCategoriesByBarIdAndNames should call db.dbCategory.findMany', async () => {
      db.dbCategory.findMany.mockResolvedValue([]);
      await repository.findCategoriesByBarIdAndNames('bar1', ['Cat']);
      expect(db.dbCategory.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar1', name: { in: ['Cat'] } },
      });
    });

    it('createManyProducts should call db.dbProduct.createMany', async () => {
      const data = [{ categoryId: 'cat1', name: 'Prod', price: 10, currentStock: 0, minStockAlert: 0 }];
      await repository.createManyProducts(data);
      expect(db.dbProduct.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });
  });
});
