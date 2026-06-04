import type { Product } from '@coaster/common';
import { asBarId, asProductId, asCategoryId } from '../../../core';
import { ForbiddenException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductStockChangedEvent } from '../../../events';
import { UpdateProductCommand } from './update-product.command';
import { UpdateProductHandler } from './update-product.handler';

describe('UpdateProductHandler', () => {
  let handler: UpdateProductHandler;
  const repository = {
    checkCategoryBelongsToBar: vi.fn(),
    update: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<UpdateProductHandler>(UpdateProductHandler);
  });

  const barId = asBarId('bar-1');
  const productId = asProductId('prod-1');
  const dto = { categoryId: asCategoryId('cat-2'), name: 'Refresco Actualizado' };

  it('should throw ForbiddenException if new category does not belong to bar', async () => {
    repository.checkCategoryBelongsToBar.mockResolvedValue(false);

    const cmd = new UpdateProductCommand(barId, productId, dto);
    await expect(handler.execute(cmd)).rejects.toThrow(ForbiddenException);
  });

  it('should update product and publish stock changed event', async () => {
    repository.checkCategoryBelongsToBar.mockResolvedValue(true);
    repository.update.mockResolvedValue({
      id: 'prod-1',
      categoryId: 'cat-2',
      name: 'Refresco Actualizado',
      price: 2,
      currentStock: 10,
      minStockAlert: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const cmd = new UpdateProductCommand(barId, productId, dto);
    await handler.execute(cmd);

    expect(repository.update).toHaveBeenCalledWith(productId, dto);
    expect(eventBus.publish).toHaveBeenCalledWith(new ProductStockChangedEvent(barId, expect.any(Object) as unknown as Product));
  });
});
