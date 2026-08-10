import { asEstablishmentId, asCategoryId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesWriteRepository } from './categories.write.repository';

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
      const establishmentId = asEstablishmentId('establishment-1');
      const createCategoryDto = { name: 'Category 1' };
      const expectedResult = { id: 'cat-1', establishmentId, ...createCategoryDto };
      vi.mocked(dbService.dbCategory.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(establishmentId, createCategoryDto as any);

      expect(dbService.dbCategory.create).toHaveBeenCalledWith({
        data: {
          establishmentId,
          ...createCategoryDto,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call dbCategory.update with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const categoryId = asCategoryId('cat-1');
      const updateData = { name: 'Updated Category 1' };
      const expectedResult = { id: 'cat-1', ...updateData };
      vi.mocked(dbService.dbCategory.update).mockResolvedValue(expectedResult as any);

      const result = await repository.update(establishmentId, categoryId, updateData as any);

      expect(dbService.dbCategory.update).toHaveBeenCalledWith({
        where: { id: categoryId, establishmentId },
        data: updateData,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should scope the soft delete to the owning establishment', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const categoryId = asCategoryId('cat-1');
      const expectedResult = { id: 'cat-1' };
      vi.mocked(dbService.dbCategory.update).mockResolvedValue(expectedResult as any);

      const result = await repository.delete(establishmentId, categoryId);

      expect(dbService.dbCategory.update).toHaveBeenCalledWith({
        where: { id: categoryId, establishmentId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
