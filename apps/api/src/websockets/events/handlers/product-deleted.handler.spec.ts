import { SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductDeletedEvent } from '@products/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asProductId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
import { ProductDeletedHandler } from './product-deleted.handler';

describe('ProductDeletedHandler', () => {
  let handler: ProductDeletedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductDeletedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<ProductDeletedHandler>(ProductDeletedHandler);
  });

  it('should emit PRODUCT_DELETED event', () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const event = new ProductDeletedEvent(barId, productId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.productDeleted, { id: productId });
  });
});
