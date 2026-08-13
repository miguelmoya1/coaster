import type { Product } from '@coaster/common';
import { asEstablishmentId, asProductId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { UpdateProductStockCommand } from '../impl/update-product-stock.command';
import { UpdateProductStockHandler } from './update-product-stock.handler';

describe('UpdateProductStockHandler', () => {
  let handler: UpdateProductStockHandler;
  const repository = {
    update: vi.fn(),
    checkProductBelongsToEstablishment: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductStockHandler,
        { provide: ProductsWriteRepository, useValue: repository },
        { provide: ProductsReadRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<UpdateProductStockHandler>(UpdateProductStockHandler);
  });

  it('should update stock and publish event', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productId = asProductId('prod-1');
    const dto = { currentStock: 10 };

    repository.checkProductBelongsToEstablishment.mockResolvedValue(true);
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

    const cmd = new UpdateProductStockCommand(establishmentId, productId, dto);
    await handler.execute(cmd);

    expect(repository.update).toHaveBeenCalledWith(productId, dto);
    expect(eventBus.publish).toHaveBeenCalledWith(
      new ProductStockChangedEvent(establishmentId, expect.any(Object) as unknown as Product),
    );
  });

  it('should refuse to change stock of a product owned by another establishment', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productId = asProductId('prod-from-other-establishment');
    repository.checkProductBelongsToEstablishment.mockResolvedValue(false);

    await expect(
      handler.execute(new UpdateProductStockCommand(establishmentId, productId, { currentStock: 10 })),
    ).rejects.toThrow(NotFoundException);

    expect(repository.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
