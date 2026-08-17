import { CategoryCreatedEvent } from '@coaster/categories';
import { SocketEvents, asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { CategoryCreatedHandler } from './category-created.handler';

describe('CategoryCreatedHandler', () => {
  let handler: CategoryCreatedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryCreatedHandler,
        {
          provide: EstablishmentGateway,
          useValue: {
            server: {
              to: mockTo,
            },
          },
        },
      ],
    }).compile();

    handler = module.get<CategoryCreatedHandler>(CategoryCreatedHandler);
    vi.clearAllMocks();
  });

  it('should emit CATEGORY_CREATED event to the correct establishment room', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const categoryData = { id: 'cat-1', name: 'Test' } as any;
    const event = new CategoryCreatedEvent(establishmentId, categoryData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.categoryCreated, categoryData);
  });
});
