import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplatesWriteRepository } from './templates.write.repository';
import { DbService } from '../../db';

describe('TemplatesWriteRepository', () => {
  let repository: TemplatesWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbCategoryTemplate: {
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
              findFirst: vi.fn(),
            },
            dbProductTemplate: {
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
              findFirst: vi.fn(),
            },
            dbCategory: {
              createMany: vi.fn(),
            },
            dbProduct: {
              createMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<TemplatesWriteRepository>(TemplatesWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('Category Template Write Ops', () => {
    it('should create', async () => {
      const data = { name: 'Test' };
      vi.mocked(dbService.dbCategoryTemplate.create).mockResolvedValue({ id: '1', ...data } as any);
      await repository.createCategoryTemplate(data);
      expect(dbService.dbCategoryTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('should update', async () => {
      const id = '1';
      const data = { name: 'Test 2' };
      vi.mocked(dbService.dbCategoryTemplate.update).mockResolvedValue({ id, ...data } as any);
      await repository.updateCategoryTemplate(id, data);
      expect(dbService.dbCategoryTemplate.update).toHaveBeenCalledWith({ where: { id }, data });
    });

    it('should delete', async () => {
      const id = '1';
      vi.mocked(dbService.dbCategoryTemplate.delete).mockResolvedValue({ id } as any);
      await repository.deleteCategoryTemplate(id);
      expect(dbService.dbCategoryTemplate.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('Product Template Write Ops', () => {
    it('should create', async () => {
      const data = { name: 'Test', price: 10, categoryId: 'cat-1' };
      vi.mocked(dbService.dbProductTemplate.create).mockResolvedValue({ id: '1', ...data } as any);
      await repository.createProductTemplate(data);
      expect(dbService.dbProductTemplate.create).toHaveBeenCalledWith({ data });
    });

    it('should update', async () => {
      const id = '1';
      const data = { name: 'Test 2' };
      vi.mocked(dbService.dbProductTemplate.update).mockResolvedValue({ id, ...data } as any);
      await repository.updateProductTemplate(id, data as any);
      expect(dbService.dbProductTemplate.update).toHaveBeenCalledWith({ where: { id }, data });
    });

    it('should delete', async () => {
      const id = '1';
      vi.mocked(dbService.dbProductTemplate.delete).mockResolvedValue({ id } as any);
      await repository.deleteProductTemplate(id);
      expect(dbService.dbProductTemplate.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('upsertCategoryTemplate', () => {
    it('should update existing if icon changed', async () => {
      vi.mocked(dbService.dbCategoryTemplate.findFirst).mockResolvedValue({ id: '1', name: 'Test', icon: 'old' } as any);
      vi.mocked(dbService.dbCategoryTemplate.update).mockResolvedValue({ id: '1', name: 'Test', icon: 'new' } as any);

      await repository.upsertCategoryTemplate('Test', 'new');
      expect(dbService.dbCategoryTemplate.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { icon: 'new' } });
    });

    it('should return existing if icon unchanged', async () => {
      vi.mocked(dbService.dbCategoryTemplate.findFirst).mockResolvedValue({ id: '1', name: 'Test', icon: 'old' } as any);
      
      const res = await repository.upsertCategoryTemplate('Test', 'old');
      expect(dbService.dbCategoryTemplate.update).not.toHaveBeenCalled();
      expect(res).toEqual({ id: '1', name: 'Test', icon: 'old' });
    });

    it('should create if not exists', async () => {
      vi.mocked(dbService.dbCategoryTemplate.findFirst).mockResolvedValue(null);
      await repository.upsertCategoryTemplate('Test', 'icon');
      expect(dbService.dbCategoryTemplate.create).toHaveBeenCalledWith({ data: { name: 'Test', icon: 'icon' } });
    });
  });

  describe('upsertProductTemplate', () => {
    it('should update existing if price changed', async () => {
      vi.mocked(dbService.dbProductTemplate.findFirst).mockResolvedValue({ id: '1', name: 'Test', categoryId: 'c1', price: 10 } as any);
      await repository.upsertProductTemplate('Test', 20, 'c1');
      expect(dbService.dbProductTemplate.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { price: 20 } });
    });

    it('should return existing if price unchanged', async () => {
      vi.mocked(dbService.dbProductTemplate.findFirst).mockResolvedValue({ id: '1', name: 'Test', categoryId: 'c1', price: 10 } as any);
      await repository.upsertProductTemplate('Test', 10, 'c1');
      expect(dbService.dbProductTemplate.update).not.toHaveBeenCalled();
    });

    it('should create if not exists', async () => {
      vi.mocked(dbService.dbProductTemplate.findFirst).mockResolvedValue(null);
      await repository.upsertProductTemplate('Test', 10, 'c1');
      expect(dbService.dbProductTemplate.create).toHaveBeenCalledWith({ data: { name: 'Test', price: 10, categoryId: 'c1' } });
    });
  });

  describe('createManyCategories', () => {
    it('should call dbCategory.createMany', async () => {
      const data = [{ barId: '1', name: 'Test', icon: 'icon' }];
      await repository.createManyCategories(data);
      expect(dbService.dbCategory.createMany).toHaveBeenCalledWith({ data, skipDuplicates: true });
    });
  });

  describe('createManyProducts', () => {
    it('should call dbProduct.createMany', async () => {
      const data = [{ categoryId: '1', name: 'Test', price: 10, currentStock: 0, minStockAlert: 0 }];
      await repository.createManyProducts(data);
      expect(dbService.dbProduct.createMany).toHaveBeenCalledWith({ data, skipDuplicates: true });
    });
  });
});
