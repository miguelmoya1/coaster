import { RealtimeEvents, asEstablishmentId } from '@coaster/common';
import { ProductUpdatedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { ProductUpdatedHandler } from './product-updated.handler';

describe('ProductUpdatedHandler', () => {
  let handler: ProductUpdatedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductUpdatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<ProductUpdatedHandler>(ProductUpdatedHandler);
    vi.clearAllMocks();
  });

  it('should emit PRODUCT_UPDATED event to the establishment', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productData = { id: 'prod-1', name: 'Test' } as any;
    const event = new ProductUpdatedEvent(establishmentId, productData);
    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.productUpdated, productData);
  });
});
