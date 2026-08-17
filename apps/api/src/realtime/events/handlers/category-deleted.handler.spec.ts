import { CategoryDeletedEvent } from '@coaster/categories';
import { SocketEvents, asEstablishmentId, asCategoryId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { CategoryDeletedHandler } from './category-deleted.handler';

describe('CategoryDeletedHandler', () => {
  let handler: CategoryDeletedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryDeletedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<CategoryDeletedHandler>(CategoryDeletedHandler);
  });

  it('should emit socket event when category is deleted', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const categoryId = asCategoryId('cat-1');
    const event = new CategoryDeletedEvent(establishmentId, categoryId);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.categoryDeleted, { id: categoryId });
  });
});
