import { asBarId, asCategoryId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, PermissionsGuard } from '../../core';
import { CreateCategoryCommand, UpdateCategoryCommand, DeleteCategoryCommand } from '../commands';
import { GetCategoriesQuery } from '../queries';
import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getCategories should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getCategories(asBarId('bar-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetCategoriesQuery));
  });

  it('createCategory should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'cat-1' });
    const dto = { name: 'Comida' };

    await controller.createCategory(asBarId('bar-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateCategoryCommand));
  });

  it('updateCategory should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'cat-1', name: 'Bebidas' });
    const dto = { name: 'Bebidas' };

    await controller.updateCategory(asBarId('bar-1'), 'cat-1', dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateCategoryCommand));
  });

  it('deleteCategory should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.deleteCategory(asBarId('bar-1'), asCategoryId('cat-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteCategoryCommand));
  });
});
