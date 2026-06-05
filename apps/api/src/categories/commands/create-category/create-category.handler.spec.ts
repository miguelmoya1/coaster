import { asBarId, asCategoryId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CreateCategoryCommand } from './create-category.command';
import { CreateCategoryHandler } from './create-category.handler';
import { CategoryCreatedEvent } from '../../../events';

describe('CreateCategoryHandler', () => {
  let handler: CreateCategoryHandler;
  const repository = {
    create: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCategoryHandler,
        { provide: CategoriesRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
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
    expect(eventBus.publish).toHaveBeenCalledWith(
      new CategoryCreatedEvent(barId, {
        id: asCategoryId('cat-1'),
        barId: barId,
        name: 'Comida',
        icon: undefined,
      }),
    );
    expect(result).toBeUndefined();
  });
});
