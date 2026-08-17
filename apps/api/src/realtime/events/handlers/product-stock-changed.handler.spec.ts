import type { Product } from '@coaster/common';
import { asEstablishmentId, SocketEvents } from '@coaster/common';
import { ProductStockChangedEvent } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { ProductStockChangedHandler } from './product-stock-changed.handler';

describe('ProductStockChangedHandler', () => {
  let handler: ProductStockChangedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductStockChangedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<ProductStockChangedHandler>(ProductStockChangedHandler);
  });

  it('should emit PRODUCT_STOCK_CHANGED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const product = { id: 'prod-1', name: 'Soda', currentStock: 10 } as unknown as Product;
    const event = new ProductStockChangedEvent(establishmentId, product);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.productStockChanged, product);
  });
});
