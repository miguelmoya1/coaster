import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductUpdatedHandler } from './product-updated.handler';
import { BarGateway } from '../../../bar.gateway';
import { ProductUpdatedEvent } from '../../../../events';
import { asBarId, SocketEvents } from '../../../../core';

describe('ProductUpdatedHandler', () => {
  let handler: ProductUpdatedHandler;
  let barGateway: BarGateway;

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
    barGateway = module.get<BarGateway>(BarGateway);
    vi.clearAllMocks();
  });

  it('should emit PRODUCT_UPDATED event to the correct bar room', () => {
    const barId = asBarId('bar-1');
    const productData = { id: 'prod-1', name: 'Test' } as any;
    const event = new ProductUpdatedEvent(barId, productData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.PRODUCT_UPDATED, productData);
  });
});
