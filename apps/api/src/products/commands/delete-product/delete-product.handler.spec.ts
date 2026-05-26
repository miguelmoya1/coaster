import { asBarId, asProductId } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductsRepository } from '../../data-access/products.repository';
import { ProductDeletedEvent } from '../../events';
import { DeleteProductCommand } from './delete-product.command';
import { DeleteProductHandler } from './delete-product.handler';

describe('DeleteProductHandler', () => {
  let handler: DeleteProductHandler;
  const repository = {
    delete: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteProductHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<DeleteProductHandler>(DeleteProductHandler);
  });

  it('should delete product and publish event', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');

    repository.delete.mockResolvedValue(undefined);

    const cmd = new DeleteProductCommand(barId, productId);
    await handler.execute(cmd);

    expect(repository.delete).toHaveBeenCalledWith(productId);
    expect(eventBus.publish).toHaveBeenCalledWith(new ProductDeletedEvent(barId, productId));
  });
});
