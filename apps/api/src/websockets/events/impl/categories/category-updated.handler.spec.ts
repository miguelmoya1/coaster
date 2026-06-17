import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryUpdatedHandler } from './category-updated.handler';
import { BarGateway } from '../../../bar.gateway';
import { CategoryUpdatedEvent } from '../../../../events';
import { asBarId, SocketEvents } from '../../../../core';

describe('CategoryUpdatedHandler', () => {
  let handler: CategoryUpdatedHandler;
  let barGateway: BarGateway;

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
    barGateway = module.get<BarGateway>(BarGateway);
    vi.clearAllMocks();
  });

  it('should emit CATEGORY_UPDATED event to the correct bar room', () => {
    const barId = asBarId('bar-1');
    const categoryData = { id: 'cat-1', name: 'Test' } as any;
    const event = new CategoryUpdatedEvent(barId, categoryData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.CATEGORY_UPDATED, categoryData);
  });
});
