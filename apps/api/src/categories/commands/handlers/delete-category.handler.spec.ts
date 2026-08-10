import { asEstablishmentId, asCategoryId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesWriteRepository } from '../../data-access/categories.write.repository';
import { CategoryDeletedEvent } from '../../events';
import { DeleteCategoryCommand } from '../impl/delete-category.command';
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
        { provide: CategoriesWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<DeleteCategoryHandler>(DeleteCategoryHandler);
  });

  it('should delete category and publish event', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const catId = asCategoryId('cat-1');
    repository.delete.mockResolvedValue(undefined);

    await handler.execute(new DeleteCategoryCommand(establishmentId, catId));

    expect(repository.delete).toHaveBeenCalledWith(establishmentId, catId);
    expect(eventBus.publish).toHaveBeenCalledWith(new CategoryDeletedEvent(establishmentId, catId));
  });

  it('should answer 404 when the category belongs to another establishment, not blow up with a 500', async () => {
    vi.clearAllMocks();
    repository.delete.mockRejectedValue(Object.assign(new Error('Record to update not found'), { code: 'P2025' }));

    await expect(
      handler.execute(
        new DeleteCategoryCommand(asEstablishmentId('establishment-1'), asCategoryId('cat-of-another-establishment')),
      ),
    ).rejects.toThrow(NotFoundException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should let an unexpected database failure through untouched', async () => {
    vi.clearAllMocks();
    repository.delete.mockRejectedValue(Object.assign(new Error('connection lost'), { code: 'P1001' }));

    await expect(
      handler.execute(new DeleteCategoryCommand(asEstablishmentId('establishment-1'), asCategoryId('cat-1'))),
    ).rejects.toThrow('connection lost');
  });
});
