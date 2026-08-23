import { CategoryUpdatedEvent } from '@coaster/categories';
import { RealtimeEvents, asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { CategoryUpdatedHandler } from './category-updated.handler';

describe('CategoryUpdatedHandler', () => {
  let handler: CategoryUpdatedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryUpdatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<CategoryUpdatedHandler>(CategoryUpdatedHandler);
    vi.clearAllMocks();
  });

  it('should emit CATEGORY_UPDATED event to the establishment', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const categoryData = { id: 'cat-1', name: 'Test' } as any;
    const event = new CategoryUpdatedEvent(establishmentId, categoryData);
    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.categoryUpdated, categoryData);
  });
});
