import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProductHandler } from './update-product.handler';
import { UpdateProductCommand } from './update-product.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { BarGateway } from '../../../core';
import { asBarId, asProductId, SocketEvents } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';

describe('UpdateProductHandler', () => {
  let handler: UpdateProductHandler;
  let repository = {
    checkCategoryBelongsToBar: vi.fn(),
    update: vi.fn(),
  };
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<UpdateProductHandler>(UpdateProductHandler);
  });

  const barId = asBarId('bar-1');
  const productId = asProductId('prod-1');
  const dto = { categoryId: 'cat-2', name: 'Refresco Actualizado' };

  it('should throw ForbiddenException if new category does not belong to bar', async () => {
    repository.checkCategoryBelongsToBar.mockResolvedValue(false);

    const cmd = new UpdateProductCommand(barId, productId, dto);
    await expect(handler.execute(cmd)).rejects.toThrow(ForbiddenException);
  });

  it('should update product and emit stock changed event', async () => {
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
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, expect.any(Object));
  });
});
