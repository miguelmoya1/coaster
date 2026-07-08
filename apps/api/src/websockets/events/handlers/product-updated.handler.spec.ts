import { SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductUpdatedEvent } from '@products/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
import { ProductUpdatedHandler } from './product-updated.handler';

describe('ProductUpdatedHandler', () => {
  let handler: ProductUpdatedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductUpdatedHandler,
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

    handler = module.get<ProductUpdatedHandler>(ProductUpdatedHandler);
    vi.clearAllMocks();
  });

  it('should emit PRODUCT_UPDATED event to the correct bar room', () => {
    const barId = asBarId('bar-1');
    const productData = { id: 'prod-1', name: 'Test' } as any;
    const event = new ProductUpdatedEvent(barId, productData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.productUpdated, productData);
  });
});
