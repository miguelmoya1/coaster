import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProductStockHandler } from './update-product-stock.handler';
import { UpdateProductStockCommand } from './update-product-stock.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { BarGateway } from '../../../core';
import { asBarId, asProductId, SocketEvents } from '@coaster/common';

describe('UpdateProductStockHandler', () => {
  let handler: UpdateProductStockHandler;
  let repository = {
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
        UpdateProductStockHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<UpdateProductStockHandler>(UpdateProductStockHandler);
  });

  it('should update stock and emit socket event', async () => {
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
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, expect.any(Object));
  });
});
