import { asBarId, Product, SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../../core';
import { ProductCreatedEvent } from './product-created.event';
import { ProductCreatedHandler } from './product-created.handler';

describe('ProductCreatedHandler', () => {
  let handler: ProductCreatedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductCreatedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<ProductCreatedHandler>(ProductCreatedHandler);
  });

  it('should emit PRODUCT_CREATED event', () => {
    const barId = asBarId('bar-1');
    const product = { id: 'prod-1', name: 'Soda' } as unknown as Product;
    const event = new ProductCreatedEvent(barId, product);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_CREATED, product);
  });
});
