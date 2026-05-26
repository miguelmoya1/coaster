import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryDeletedHandler } from './category-deleted.handler';
import { CategoryDeletedEvent } from './category-deleted.event';
import { BarGateway } from '../../../core';
import { asBarId, asCategoryId, SocketEvents } from '@coaster/common';

describe('CategoryDeletedHandler', () => {
  let handler: CategoryDeletedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryDeletedHandler,
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<CategoryDeletedHandler>(CategoryDeletedHandler);
  });

  it('should emit socket event when category is deleted', () => {
    const barId = asBarId('bar-1');
    const categoryId = asCategoryId('cat-1');
    const event = new CategoryDeletedEvent(barId, categoryId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.CATEGORY_DELETED, { id: categoryId });
  });
});
