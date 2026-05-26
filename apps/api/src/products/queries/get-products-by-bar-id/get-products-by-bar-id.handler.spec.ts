import { asBarId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductsRepository } from '../../data-access/products.repository';
import { GetProductsByBarIdHandler } from './get-products-by-bar-id.handler';
import { GetProductsByBarIdQuery } from './get-products-by-bar-id.query';

describe('GetProductsByBarIdHandler', () => {
  let handler: GetProductsByBarIdHandler;
  const repository = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetProductsByBarIdHandler, { provide: ProductsRepository, useValue: repository }],
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
