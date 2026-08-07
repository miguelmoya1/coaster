import type { Product } from '@coaster/common';
import { asBarId, asCategoryId, asProductId } from '@coaster/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { UpdateProductCommand } from '../impl/update-product.command';
import { UpdateProductHandler } from './update-product.handler';

describe('UpdateProductHandler', () => {
  let handler: UpdateProductHandler;
  const repository = {
    checkCategoryBelongsToBar: vi.fn(),
    checkProductBelongsToBar: vi.fn(),
    update: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductHandler,
        { provide: ProductsWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: ProductsReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<UpdateProductHandler>(UpdateProductHandler);
  });

  const barId = asBarId('bar-1');
  const productId = asProductId('prod-1');
  const dto = { categoryId: asCategoryId('cat-2'), name: 'Refresco Actualizado' };

  it('should refuse to update a product owned by another bar', async () => {
    repository.checkProductBelongsToBar.mockResolvedValue(false);

    await expect(handler.execute(new UpdateProductCommand(barId, productId, dto))).rejects.toThrow(NotFoundException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if new category does not belong to bar', async () => {
    repository.checkProductBelongsToBar.mockResolvedValue(true);
    repository.checkCategoryBelongsToBar.mockResolvedValue(false);

    const cmd = new UpdateProductCommand(barId, productId, dto);
    await expect(handler.execute(cmd)).rejects.toThrow(ForbiddenException);
  });

  it('should update product and publish stock changed event', async () => {
    repository.checkProductBelongsToBar.mockResolvedValue(true);
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
    expect(eventBus.publish).toHaveBeenCalledWith(
      new ProductStockChangedEvent(barId, expect.any(Object) as unknown as Product),
    );
  });
});
