import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { GetProductsByEstablishmentIdQuery } from '../impl/get-products-by-establishment-id.query';
import { GetProductsByEstablishmentIdHandler } from './get-products-by-establishment-id.handler';

describe('GetProductsByEstablishmentIdHandler', () => {
  let handler: GetProductsByEstablishmentIdHandler;
  const repository = {
    findByEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetProductsByEstablishmentIdHandler, { provide: ProductsReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetProductsByEstablishmentIdHandler>(GetProductsByEstablishmentIdHandler);
  });

  it('should return products by establishment ID', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    repository.findByEstablishmentId.mockResolvedValue([]);

    const result = await handler.execute(new GetProductsByEstablishmentIdQuery(establishmentId));

    expect(repository.findByEstablishmentId).toHaveBeenCalledWith(establishmentId);
    expect(result).toEqual([]);
  });
});
