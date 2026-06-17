import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryCreatedHandler } from './category-created.handler';
import { BarGateway } from '../../../bar.gateway';
import { CategoryCreatedEvent } from '../../../../events';
import { asBarId, SocketEvents } from '../../../../core';

describe('CategoryCreatedHandler', () => {
  let handler: CategoryCreatedHandler;
  let barGateway: BarGateway;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryCreatedHandler,
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

    handler = module.get<CategoryCreatedHandler>(CategoryCreatedHandler);
    barGateway = module.get<BarGateway>(BarGateway);
    vi.clearAllMocks();
  });

  it('should emit CATEGORY_CREATED event to the correct bar room', () => {
    const barId = asBarId('bar-1');
    const categoryData = { id: 'cat-1', name: 'Test' } as any;
    const event = new CategoryCreatedEvent(barId, categoryData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.CATEGORY_CREATED, categoryData);
  });
});
