import { asEstablishmentId, asCategoryId } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesWriteRepository } from '../../data-access/categories.write.repository';
import { CategoryCreatedEvent } from '../../events';
import { CreateCategoryCommand } from '../impl/create-category.command';
import { CreateCategoryHandler } from './create-category.handler';

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
        { provide: CategoriesWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateCategoryHandler>(CreateCategoryHandler);
  });

  it('should create category', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const dto = { name: 'Comida' };
    repository.create.mockResolvedValue({
      id: 'cat-1',
      establishmentId: 'establishment-1',
      name: 'Comida',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new CreateCategoryCommand(establishmentId, dto));

    expect(repository.create).toHaveBeenCalledWith(establishmentId, dto);
    expect(eventBus.publish).toHaveBeenCalledWith(
      new CategoryCreatedEvent(establishmentId, {
        id: asCategoryId('cat-1'),
        establishmentId: establishmentId,
        name: 'Comida',
        icon: undefined,
      }),
    );
    expect(result).toBeUndefined();
  });
});
