import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteCategoryHandler } from './delete-category.handler';
import { DeleteCategoryCommand } from './delete-category.command';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { EventBus } from '@nestjs/cqrs';
import { asBarId, asCategoryId } from '@coaster/common';
import { CategoryDeletedEvent } from '../../events';

describe('DeleteCategoryHandler', () => {
  let handler: DeleteCategoryHandler;
  let repository = {
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
