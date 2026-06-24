import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asCategoryId } from '../../../core';
import { CategoriesWriteRepository } from '../../data-access/categories.write.repository';
import { CategoryUpdatedEvent } from '../../events';
import { UpdateCategoryCommand } from '../impl/update-category.command';
import { UpdateCategoryHandler } from './update-category.handler';

describe('UpdateCategoryHandler', () => {
  let handler: UpdateCategoryHandler;
  const repository = {
    update: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateCategoryHandler,
        { provide: CategoriesWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
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
    expect(eventBus.publish).toHaveBeenCalledWith(
      new CategoryUpdatedEvent(barId, {
        id: catId,
        barId: barId,
        name: 'Bebidas',
        icon: undefined,
      }),
    );
    expect(result).toBeUndefined();
  });
});
