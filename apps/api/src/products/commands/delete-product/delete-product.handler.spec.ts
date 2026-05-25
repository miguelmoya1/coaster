import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteProductHandler } from './delete-product.handler';
import { DeleteProductCommand } from './delete-product.command';
import { ProductsRepository } from '../../data-access/products.repository';
import { BarGateway } from '../../../core';
import { asBarId, asProductId, SocketEvents } from '@coaster/common';

describe('DeleteProductHandler', () => {
  let handler: DeleteProductHandler;
  let repository = {
    delete: vi.fn(),
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
        DeleteProductHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<DeleteProductHandler>(DeleteProductHandler);
  });

  it('should delete product and emit socket event', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');

    repository.delete.mockResolvedValue(undefined);

    const cmd = new DeleteProductCommand(barId, productId);
    await handler.execute(cmd);

    expect(repository.delete).toHaveBeenCalledWith(productId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_DELETED, { id: productId });
  });
});
