import type { Product } from '@coaster/common';
import { asBarId, SocketEvents } from '../../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../../core';
import { ProductStockChangedEvent } from './product-stock-changed.event';
import { ProductStockChangedHandler } from './product-stock-changed.handler';

describe('ProductStockChangedHandler', () => {
  let handler: ProductStockChangedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductStockChangedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<ProductStockChangedHandler>(ProductStockChangedHandler);
  });

  it('should emit PRODUCT_STOCK_CHANGED event', () => {
    const barId = asBarId('bar-1');
    const product = { id: 'prod-1', name: 'Soda', currentStock: 10 } as unknown as Product;
    const event = new ProductStockChangedEvent(barId, product);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, product);
  });
});
