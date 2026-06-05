import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { asBarId } from '../../core';
import { DbService } from '../../db';
import { CategoriesRepository } from './categories.repository';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let db: {
    dbCategory: { create: Mock; findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbCategory: { create: vi.fn(), findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<CategoriesRepository>(CategoriesRepository);
    db = module.get(DbService);
  });

  describe('create', () => {
    it('should create a category with included products', async () => {
      db.dbCategory.create.mockResolvedValue({ id: 'cat-1', name: 'Bebidas' });

      const result = await repository.create(asBarId('bar-1'), { name: 'Bebidas', icon: 'beer' });

      expect(db.dbCategory.create).toHaveBeenCalledWith({
        data: { bar: { connect: { id: 'bar-1' } }, name: 'Bebidas', icon: 'beer' },
      });
      expect(result).toEqual({ id: 'cat-1', name: 'Bebidas' });
    });
  });

  describe('findByBarId', () => {
    it('should find bar categories with sorted products', async () => {
      db.dbCategory.findMany.mockResolvedValue([{ id: 'cat-1' }]);

      const result = await repository.findByBarId(asBarId('bar-1'));

      expect(db.dbCategory.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([{ id: 'cat-1' }]);
    });
  });
});
