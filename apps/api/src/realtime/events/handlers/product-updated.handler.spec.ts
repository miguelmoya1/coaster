import { SocketEvents, asEstablishmentId } from '@coaster/common';
import { ProductUpdatedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
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
          provide: EstablishmentGateway,
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

  it('should emit PRODUCT_UPDATED event to the correct establishment room', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productData = { id: 'prod-1', name: 'Test' } as any;
    const event = new ProductUpdatedEvent(establishmentId, productData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.productUpdated, productData);
  });
});
