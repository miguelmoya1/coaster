import { asEstablishmentId, asProductId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsWriteRepository } from '../../data-access/products.write.repository';
import { ProductDeletedEvent } from '../../events';
import { DeleteProductCommand } from '../impl/delete-product.command';
import { DeleteProductHandler } from './delete-product.handler';

describe('DeleteProductHandler', () => {
  let handler: DeleteProductHandler;
  const repository = {
    delete: vi.fn(),
    checkProductBelongsToEstablishment: vi.fn(),
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
    const establishmentId = asEstablishmentId('establishment-1');
    const productId = asProductId('prod-1');

    repository.checkProductBelongsToEstablishment.mockResolvedValue(true);
    repository.delete.mockResolvedValue(undefined);

    const cmd = new DeleteProductCommand(establishmentId, productId);
    await handler.execute(cmd);

    expect(repository.delete).toHaveBeenCalledWith(productId);
    expect(eventBus.publish).toHaveBeenCalledWith(new ProductDeletedEvent(establishmentId, productId));
  });

  it('should refuse to delete a product owned by another establishment', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const productId = asProductId('prod-from-other-establishment');
    repository.checkProductBelongsToEstablishment.mockResolvedValue(false);

    await expect(handler.execute(new DeleteProductCommand(establishmentId, productId))).rejects.toThrow(
      NotFoundException,
    );

    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
