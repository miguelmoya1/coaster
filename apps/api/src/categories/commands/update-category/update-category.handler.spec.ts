import { asBarId, asCategoryId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { UpdateCategoryCommand } from './update-category.command';
import { UpdateCategoryHandler } from './update-category.handler';

describe('UpdateCategoryHandler', () => {
  let handler: UpdateCategoryHandler;
  const repository = {
    update: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdateCategoryHandler, { provide: CategoriesRepository, useValue: repository }],
    }).compile();

    handler = module.get<UpdateCategoryHandler>(UpdateCategoryHandler);
  });

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

    const result = await handler.execute(new UpdateCategoryCommand(barId, catId, dto));

    expect(repository.update).toHaveBeenCalledWith(barId, catId, dto);
    expect(result.name).toBe('Bebidas');
  });
});
