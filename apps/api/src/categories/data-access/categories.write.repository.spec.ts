import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoriesWriteRepository } from './categories.write.repository';
import { DbService } from '../../db';
import { asBarId, asCategoryId } from '../../core';

describe('CategoriesWriteRepository', () => {
  let repository: CategoriesWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbCategory: {
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<CategoriesWriteRepository>(CategoriesWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call dbCategory.create with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const createCategoryDto = { name: 'Category 1' };
      const expectedResult = { id: 'cat-1', barId, ...createCategoryDto };
      vi.mocked(dbService.dbCategory.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(barId, createCategoryDto as any);

      expect(dbService.dbCategory.create).toHaveBeenCalledWith({
        data: {
          barId,
          ...createCategoryDto,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call dbCategory.update with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const categoryId = asCategoryId('cat-1');
      const updateData = { name: 'Updated Category 1' };
      const expectedResult = { id: 'cat-1', ...updateData };
      vi.mocked(dbService.dbCategory.update).mockResolvedValue(expectedResult as any);

      const result = await repository.update(barId, categoryId, updateData as any);

      expect(dbService.dbCategory.update).toHaveBeenCalledWith({
        where: { id: categoryId, barId },
        data: updateData,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call dbCategory.delete with correct parameters', async () => {
      const categoryId = asCategoryId('cat-1');
      const expectedResult = { id: 'cat-1' };
      vi.mocked(dbService.dbCategory.delete).mockResolvedValue(expectedResult as any);

      const result = await repository.delete(categoryId);

      expect(dbService.dbCategory.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
