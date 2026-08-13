import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { GetOrdersByEstablishmentIdQuery } from '../impl/get-orders-by-establishment-id.query';
import { GetOrdersByEstablishmentIdHandler } from './get-orders-by-establishment-id.handler';

describe('GetOrdersByEstablishmentIdHandler', () => {
  let handler: GetOrdersByEstablishmentIdHandler;
  const repository = {
    findByEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetOrdersByEstablishmentIdHandler, { provide: OrdersReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetOrdersByEstablishmentIdHandler>(GetOrdersByEstablishmentIdHandler);
  });

  it('should return orders by establishment ID', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    repository.findByEstablishmentId.mockResolvedValue([]);

    const result = await handler.execute(new GetOrdersByEstablishmentIdQuery(establishmentId));

    expect(repository.findByEstablishmentId).toHaveBeenCalledWith(establishmentId, undefined);
    expect(result).toEqual([]);
  });
});
