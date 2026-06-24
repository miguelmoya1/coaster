import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { GetOrdersByDateHandler } from './get-orders-by-date.handler';
import { GetOrdersByDateQuery } from '../impl/get-orders-by-date.query';

describe('GetOrdersByDateHandler', () => {
  let handler: GetOrdersByDateHandler;
  const repository = {
    findByBarIdAndDate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetOrdersByDateHandler, { provide: OrdersReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetOrdersByDateHandler>(GetOrdersByDateHandler);
  });

  it('should return orders by date', async () => {
    const barId = asBarId('bar-1');
    repository.findByBarIdAndDate.mockResolvedValue([]);

    const result = await handler.execute(new GetOrdersByDateQuery(barId, '2026-05-01'));

    expect(repository.findByBarIdAndDate).toHaveBeenCalledWith(barId, '2026-05-01');
    expect(result).toEqual([]);
  });
});
