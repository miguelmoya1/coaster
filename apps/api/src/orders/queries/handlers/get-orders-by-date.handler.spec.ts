import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { GetOrdersByDateQuery } from '../impl/get-orders-by-date.query';
import { GetOrdersByDateHandler } from './get-orders-by-date.handler';

describe('GetOrdersByDateHandler', () => {
  let handler: GetOrdersByDateHandler;
  const repository = {
    findByEstablishmentIdAndDate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetOrdersByDateHandler, { provide: OrdersReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetOrdersByDateHandler>(GetOrdersByDateHandler);
  });

  it('should return orders by date', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    repository.findByEstablishmentIdAndDate.mockResolvedValue([]);

    const result = await handler.execute(new GetOrdersByDateQuery(establishmentId, '2026-05-01'));

    expect(repository.findByEstablishmentIdAndDate).toHaveBeenCalledWith(establishmentId, '2026-05-01');
    expect(result).toEqual([]);
  });
});
