import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetProductsByBarIdHandler } from './get-products-by-bar-id.handler';
import { GetProductsByBarIdQuery } from './get-products-by-bar-id.query';
import { ProductsRepository } from '../../data-access/products.repository';
import { asBarId } from '@coaster/common';

describe('GetProductsByBarIdHandler', () => {
  let handler: GetProductsByBarIdHandler;
  let repository = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsByBarIdHandler,
        { provide: ProductsRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<GetProductsByBarIdHandler>(GetProductsByBarIdHandler);
  });

  it('should return products by bar ID', async () => {
    const barId = asBarId('bar-1');
    repository.findByBarId.mockResolvedValue([]);

    const result = await handler.execute(new GetProductsByBarIdQuery(barId));

    expect(repository.findByBarId).toHaveBeenCalledWith(barId);
    expect(result).toEqual([]);
  });
});
