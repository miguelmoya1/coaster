import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdjustProductStockHandler } from './adjust-product-stock.handler';
import { AdjustProductStockCommand } from './adjust-product-stock.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { EventBus } from '@nestjs/cqrs';
import { asBarId, asProductId } from '@coaster/common';
import { ProductStockChangedEvent } from '../../events';

describe('AdjustProductStockHandler', () => {
  let handler: AdjustProductStockHandler;
  let repository = {
    update: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustProductStockHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<AdjustProductStockHandler>(AdjustProductStockHandler);
  });

  it('should adjust stock and publish event', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const delta = -3;

    repository.update.mockResolvedValue({
      id: 'prod-1',
      categoryId: 'cat-1',
      name: 'Refresco',
      price: 2,
      currentStock: 7,
      minStockAlert: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const cmd = new AdjustProductStockCommand(barId, productId, delta);
    await handler.execute(cmd);

    expect(repository.update).toHaveBeenCalledWith(productId, {
      currentStock: {
        increment: delta,
      },
    });
    expect(eventBus.publish).toHaveBeenCalledWith(new ProductStockChangedEvent(barId, expect.any(Object)));
  });
});
