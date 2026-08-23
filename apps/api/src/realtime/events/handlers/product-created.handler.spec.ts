import type { Product } from '@coaster/common';
import { asEstablishmentId, RealtimeEvents } from '@coaster/common';
import { ProductCreatedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { ProductCreatedHandler } from './product-created.handler';

describe('ProductCreatedHandler', () => {
  let handler: ProductCreatedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductCreatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<ProductCreatedHandler>(ProductCreatedHandler);
  });

  it('should emit PRODUCT_CREATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const product = { id: 'prod-1', name: 'Soda' } as unknown as Product;
    const event = new ProductCreatedEvent(establishmentId, product);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.productCreated, product);
  });
});
