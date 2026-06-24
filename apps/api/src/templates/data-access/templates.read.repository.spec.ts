import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbService } from '../../core/db';
import { TemplatesReadRepository } from './templates.read.repository';

describe('TemplatesReadRepository', () => {
  let repository: TemplatesReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesReadRepository,
        {
          provide: DbService,
          useValue: {
            dbCategoryTemplate: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
              findFirst: vi.fn(),
            },
            dbProductTemplate: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
              findFirst: vi.fn(),
            },
            dbCategory: {
              findMany: vi.fn(),
            },
            dbProduct: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<TemplatesReadRepository>(TemplatesReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAllCategoryTemplates', () => {
    it('should call dbCategoryTemplate.findMany', async () => {
      const expectedResult = [{ id: '1' }];
      vi.mocked(dbService.dbCategoryTemplate.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findAllCategoryTemplates();

      expect(dbService.dbCategoryTemplate.findMany).toHaveBeenCalledWith({
        include: { products: true },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findCategoryTemplateById', () => {
    it('should call dbCategoryTemplate.findUnique', async () => {
      const id = '1';
      const expectedResult = { id: '1' };
      vi.mocked(dbService.dbCategoryTemplate.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findCategoryTemplateById(id);

      expect(dbService.dbCategoryTemplate.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { products: true },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAllProductTemplates', () => {
    it('should call dbProductTemplate.findMany', async () => {
      const expectedResult = [{ id: '1' }];
      vi.mocked(dbService.dbProductTemplate.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findAllProductTemplates();

      expect(dbService.dbProductTemplate.findMany).toHaveBeenCalledWith({
        include: { category: true },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findProductTemplateById', () => {
    it('should call dbProductTemplate.findUnique', async () => {
      const id = '1';
      const expectedResult = { id: '1' };
      vi.mocked(dbService.dbProductTemplate.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findProductTemplateById(id);

      expect(dbService.dbProductTemplate.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { category: true },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findCategoryTemplateByName', () => {
    it('should call dbCategoryTemplate.findFirst', async () => {
      const name = 'Test';
      const expectedResult = { id: '1' };
      vi.mocked(dbService.dbCategoryTemplate.findFirst).mockResolvedValue(expectedResult as any);

      const result = await repository.findCategoryTemplateByName(name);

      expect(dbService.dbCategoryTemplate.findFirst).toHaveBeenCalledWith({
        where: { name },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findProductTemplateByNameAndCategoryId', () => {
    it('should call dbProductTemplate.findFirst', async () => {
      const name = 'Test';
      const categoryId = 'cat-1';
      const expectedResult = { id: '1' };
      vi.mocked(dbService.dbProductTemplate.findFirst).mockResolvedValue(expectedResult as any);

      const result = await repository.findProductTemplateByNameAndCategoryId(name, categoryId);

      expect(dbService.dbProductTemplate.findFirst).toHaveBeenCalledWith({
        where: { name, categoryId },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findCategoryTemplatesByIds', () => {
    it('should call dbCategoryTemplate.findMany', async () => {
      const ids = ['1', '2'];
      const expectedResult = [{ id: '1' }];
      vi.mocked(dbService.dbCategoryTemplate.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findCategoryTemplatesByIds(ids);

      expect(dbService.dbCategoryTemplate.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        include: { products: true },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findCategoriesByBarIdAndNames', () => {
    it('should call dbCategory.findMany', async () => {
      const barId = 'bar-1';
      const names = ['Cat 1'];
      const expectedResult = [{ id: '1' }];
      vi.mocked(dbService.dbCategory.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findCategoriesByBarIdAndNames(barId, names);

      expect(dbService.dbCategory.findMany).toHaveBeenCalledWith({
        where: { barId, name: { in: names } },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findProductsByCategoryIds', () => {
    it('should call dbProduct.findMany', async () => {
      const categoryIds = ['cat-1'];
      const expectedResult = [{ id: '1' }];
      vi.mocked(dbService.dbProduct.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findProductsByCategoryIds(categoryIds);

      expect(dbService.dbProduct.findMany).toHaveBeenCalledWith({
        where: { categoryId: { in: categoryIds } },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
