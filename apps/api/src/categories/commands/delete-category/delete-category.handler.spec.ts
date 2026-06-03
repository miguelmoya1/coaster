import { asBarId, asCategoryId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoryDeletedEvent } from '../../events';
import { DeleteCategoryCommand } from './delete-category.command';
import { DeleteCategoryHandler } from './delete-category.handler';

describe('DeleteCategoryHandler', () => {
  let handler: DeleteCategoryHandler;
  const repository = {
    delete: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteCategoryHandler,
        { provide: CategoriesRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<DeleteCategoryHandler>(DeleteCategoryHandler);
  });

  it('should delete category and publish event', async () => {
    const barId = asBarId('bar-1');
    const catId = asCategoryId('cat-1');
    repository.delete.mockResolvedValue(undefined);

    await handler.execute(new DeleteCategoryCommand(barId, catId));

    expect(repository.delete).toHaveBeenCalledWith(catId);
    expect(eventBus.publish).toHaveBeenCalledWith(new CategoryDeletedEvent(barId, catId));
  });
});
