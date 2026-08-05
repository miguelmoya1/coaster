import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { asBarId, asProductId } from '../../../core';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductDeletedEvent } from '../../events';
import { DeleteProductCommand } from '../impl/delete-product.command';
import { DeleteProductHandler } from './delete-product.handler';

describe('DeleteProductHandler', () => {
  let handler: DeleteProductHandler;
  const repository = {
    delete: vi.fn(),
    checkProductBelongsToBar: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteProductHandler,
        { provide: ProductsWriteRepository, useValue: repository },
        { provide: ProductsReadRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<DeleteProductHandler>(DeleteProductHandler);
  });

  it('should delete product and publish event', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');

    repository.checkProductBelongsToBar.mockResolvedValue(true);
    repository.delete.mockResolvedValue(undefined);

    const cmd = new DeleteProductCommand(barId, productId);
    await handler.execute(cmd);

    expect(repository.delete).toHaveBeenCalledWith(productId);
    expect(eventBus.publish).toHaveBeenCalledWith(new ProductDeletedEvent(barId, productId));
  });

  it('should refuse to delete a product owned by another bar', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-from-other-bar');
    repository.checkProductBelongsToBar.mockResolvedValue(false);

    await expect(handler.execute(new DeleteProductCommand(barId, productId))).rejects.toThrow(NotFoundException);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
