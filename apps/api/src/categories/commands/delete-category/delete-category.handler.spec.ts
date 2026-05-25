import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteCategoryHandler } from './delete-category.handler';
import { DeleteCategoryCommand } from './delete-category.command';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { BarGateway } from '../../../core';
import { asBarId, asCategoryId, SocketEvents } from '@coaster/common';

describe('DeleteCategoryHandler', () => {
  let handler: DeleteCategoryHandler;
  let repository = {
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
        DeleteCategoryHandler,
        { provide: CategoriesRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<DeleteCategoryHandler>(DeleteCategoryHandler);
  });

  it('should delete category and emit event', async () => {
    const barId = asBarId('bar-1');
    const catId = asCategoryId('cat-1');
    repository.delete.mockResolvedValue(undefined);

    await handler.execute(new DeleteCategoryCommand(barId, catId));

    expect(repository.delete).toHaveBeenCalledWith(catId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.CATEGORY_DELETED, { id: catId });
  });
});
