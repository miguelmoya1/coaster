import type { Product } from '@coaster/common';
import { asEstablishmentId, SocketEvents } from '@coaster/common';
import { ProductCreatedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { ProductCreatedHandler } from './product-created.handler';

describe('ProductCreatedHandler', () => {
  let handler: ProductCreatedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductCreatedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<ProductCreatedHandler>(ProductCreatedHandler);
  });

  it('should emit PRODUCT_CREATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const product = { id: 'prod-1', name: 'Soda' } as unknown as Product;
    const event = new ProductCreatedEvent(establishmentId, product);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.productCreated, product);
  });
});
