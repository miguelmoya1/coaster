import type { Product } from '@coaster/common';
import { asEstablishmentId, RealtimeEvents } from '@coaster/common';
import { ProductStockChangedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { ProductStockChangedHandler } from './product-stock-changed.handler';

describe('ProductStockChangedHandler', () => {
  let handler: ProductStockChangedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductStockChangedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<ProductStockChangedHandler>(ProductStockChangedHandler);
  });

  it('should emit PRODUCT_STOCK_CHANGED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const product = { id: 'prod-1', name: 'Soda', currentStock: 10 } as unknown as Product;
    const event = new ProductStockChangedEvent(establishmentId, product);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.productStockChanged, product);
  });
});
