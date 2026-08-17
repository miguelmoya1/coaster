import { CategoryDeletedEvent } from '@coaster/categories';
import { RealtimeEvents, asEstablishmentId, asCategoryId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { CategoryDeletedHandler } from './category-deleted.handler';

describe('CategoryDeletedHandler', () => {
  let handler: CategoryDeletedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryDeletedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<CategoryDeletedHandler>(CategoryDeletedHandler);
  });

  it('should publish when category is deleted', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const categoryId = asCategoryId('cat-1');
    const event = new CategoryDeletedEvent(establishmentId, categoryId);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.categoryDeleted, { id: categoryId });
  });
});
