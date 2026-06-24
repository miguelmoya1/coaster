import type { Product } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asProductId } from '../../../core';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { UpdateProductStockCommand } from '../impl/update-product-stock.command';
import { UpdateProductStockHandler } from './update-product-stock.handler';

describe('UpdateProductStockHandler', () => {
  let handler: UpdateProductStockHandler;
  const repository = {
    update: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductStockHandler,
        { provide: ProductsWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<UpdateProductStockHandler>(UpdateProductStockHandler);
  });

  it('should update stock and publish event', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto = { currentStock: 10 };

    repository.update.mockResolvedValue({
      id: 'prod-1',
      categoryId: 'cat-1',
      name: 'Refresco',
      price: 2,
      currentStock: 10,
      minStockAlert: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const cmd = new UpdateProductStockCommand(barId, productId, dto);
    await handler.execute(cmd);

    expect(repository.update).toHaveBeenCalledWith(productId, dto);
    expect(eventBus.publish).toHaveBeenCalledWith(
      new ProductStockChangedEvent(barId, expect.any(Object) as unknown as Product),
    );
  });
});
