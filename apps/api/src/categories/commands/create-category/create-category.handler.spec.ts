import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCategoryHandler } from './create-category.handler';
import { CreateCategoryCommand } from './create-category.command';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { asBarId, asCategoryId } from '@coaster/common';

describe('CreateCategoryHandler', () => {
  let handler: CreateCategoryHandler;
  let repository = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCategoryHandler,
        { provide: CategoriesRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<CreateCategoryHandler>(CreateCategoryHandler);
  });

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

    const result = await handler.execute(new CreateCategoryCommand(barId, dto));

    expect(repository.create).toHaveBeenCalledWith(barId, dto);
    expect(result.id).toBe(asCategoryId('cat-1'));
  });
});
