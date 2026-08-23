import { RealtimeEvents, asEstablishmentId, asProductId } from '@coaster/common';
import { ProductDeletedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { ProductDeletedHandler } from './product-deleted.handler';

describe('ProductDeletedHandler', () => {
  let handler: ProductDeletedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductDeletedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<ProductDeletedHandler>(ProductDeletedHandler);
  });

  it('should emit PRODUCT_DELETED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productId = asProductId('prod-1');
    const event = new ProductDeletedEvent(establishmentId, productId);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.productDeleted, { id: productId });
  });
});
