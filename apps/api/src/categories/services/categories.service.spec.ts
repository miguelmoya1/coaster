import { asBarId, asCategoryId, SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../core';
import { CategoriesRepository } from '../data-access/categories.repository';
import { GetCategoriesHandler } from '../queries/get-categories/get-categories.handler';
import { GetCategoriesQuery } from '../queries';
import { CreateCategoryHandler } from '../commands/create-category/create-category.handler';
import { CreateCategoryCommand } from '../commands';
import { UpdateCategoryHandler } from '../commands/update-category/update-category.handler';
import { UpdateCategoryCommand } from '../commands';
import { DeleteCategoryHandler } from '../commands/delete-category/delete-category.handler';
import { DeleteCategoryCommand } from '../commands';

describe('Categories CQRS Handlers', () => {
  let getCategoriesHandler: GetCategoriesHandler;
  let createCategoryHandler: CreateCategoryHandler;
  let updateCategoryHandler: UpdateCategoryHandler;
  let deleteCategoryHandler: DeleteCategoryHandler;

  let repository = {
    findByBarId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoriesHandler,
        CreateCategoryHandler,
        UpdateCategoryHandler,
        DeleteCategoryHandler,
        { provide: CategoriesRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    getCategoriesHandler = module.get<GetCategoriesHandler>(GetCategoriesHandler);
    createCategoryHandler = module.get<CreateCategoryHandler>(CreateCategoryHandler);
    updateCategoryHandler = module.get<UpdateCategoryHandler>(UpdateCategoryHandler);
    deleteCategoryHandler = module.get<DeleteCategoryHandler>(DeleteCategoryHandler);
    repository = module.get(CategoriesRepository);
  });

  describe('GetCategoriesHandler', () => {
    it('should return categories', async () => {
      const barId = asBarId('bar-1');
      repository.findByBarId.mockResolvedValue([]);

      const result = await getCategoriesHandler.execute(new GetCategoriesQuery(barId));

      expect(repository.findByBarId).toHaveBeenCalledWith(barId);
      expect(result).toEqual([]);
    });
  });

  describe('CreateCategoryHandler', () => {
    it('should create category', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'Comida' };
      repository.create.mockResolvedValue({
        id: 'cat-1',
        barId: 'bar-1',
        name: 'Comida',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createCategoryHandler.execute(new CreateCategoryCommand(barId, dto));

      expect(repository.create).toHaveBeenCalledWith(barId, dto);
      expect(result.id).toBe(asCategoryId('cat-1'));
    });
  });

  describe('UpdateCategoryHandler', () => {
    it('should update category', async () => {
      const barId = asBarId('bar-1');
      const catId = asCategoryId('cat-1');
      const dto = { name: 'Bebidas' };
      repository.update.mockResolvedValue({
        id: 'cat-1',
        barId: 'bar-1',
        name: 'Bebidas',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updateCategoryHandler.execute(new UpdateCategoryCommand(barId, catId, dto));

      expect(repository.update).toHaveBeenCalledWith(barId, catId, dto);
      expect(result.name).toBe('Bebidas');
    });
  });

  describe('DeleteCategoryHandler', () => {
    it('should delete category and emit event', async () => {
      const barId = asBarId('bar-1');
      const catId = asCategoryId('cat-1');
      repository.delete.mockResolvedValue(undefined);

      await deleteCategoryHandler.execute(new DeleteCategoryCommand(barId, catId));

      expect(repository.delete).toHaveBeenCalledWith(catId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.CATEGORY_DELETED, { id: catId });
    });
  });
});
