import type { Product } from '@coaster/common';
import { asEstablishmentId, asProductId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductStockChangedEvent } from '../../events';
import { AdjustProductStockCommand } from '../impl/adjust-product-stock.command';
import { AdjustProductStockHandler } from './adjust-product-stock.handler';

describe('AdjustProductStockHandler', () => {
  let handler: AdjustProductStockHandler;
  const readRepository = {
    checkProductBelongsToEstablishment: vi.fn(),
  };
  const repository = {
    update: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustProductStockHandler,
        { provide: ProductsReadRepository, useValue: readRepository },
        { provide: ProductsWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<AdjustProductStockHandler>(AdjustProductStockHandler);
  });

  it('should refuse to touch the stock of a product from another establishment', async () => {
    readRepository.checkProductBelongsToEstablishment.mockResolvedValue(false);

    await expect(
      handler.execute(
        new AdjustProductStockCommand(asEstablishmentId('establishment-1'), asProductId('prod-of-establishment-2'), -3),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(repository.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should adjust stock and publish event', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productId = asProductId('prod-1');
    const delta = -3;

    readRepository.checkProductBelongsToEstablishment.mockResolvedValue(true);
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

    const cmd = new AdjustProductStockCommand(establishmentId, productId, delta);
    await handler.execute(cmd);

    expect(repository.update).toHaveBeenCalledWith(productId, {
      currentStock: {
        increment: delta,
      },
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new ProductStockChangedEvent(establishmentId, expect.any(Object) as unknown as Product),
    );
  });
});
