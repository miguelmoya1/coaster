import { CategoryUpdatedEvent } from '@categories/events';
import { SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
import { CategoryUpdatedHandler } from './category-updated.handler';

describe('CategoryUpdatedHandler', () => {
  let handler: CategoryUpdatedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryUpdatedHandler,
        {
          provide: BarGateway,
          useValue: {
            server: {
              to: mockTo,
            },
          },
        },
      ],
    }).compile();

    handler = module.get<CategoryUpdatedHandler>(CategoryUpdatedHandler);
    vi.clearAllMocks();
  });

  it('should emit CATEGORY_UPDATED event to the correct bar room', () => {
    const barId = asBarId('bar-1');
    const categoryData = { id: 'cat-1', name: 'Test' } as any;
    const event = new CategoryUpdatedEvent(barId, categoryData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.categoryUpdated, categoryData);
  });
});
