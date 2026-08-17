import { CategoryCreatedEvent } from '@coaster/categories';
import { RealtimeEvents, asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { CategoryCreatedHandler } from './category-created.handler';

describe('CategoryCreatedHandler', () => {
  let handler: CategoryCreatedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryCreatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<CategoryCreatedHandler>(CategoryCreatedHandler);
    vi.clearAllMocks();
  });

  it('should emit CATEGORY_CREATED event to the establishment', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const categoryData = { id: 'cat-1', name: 'Test' } as any;
    const event = new CategoryCreatedEvent(establishmentId, categoryData);
    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.categoryCreated, categoryData);
  });
});
