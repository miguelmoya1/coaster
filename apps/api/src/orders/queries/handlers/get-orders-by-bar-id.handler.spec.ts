import { asBarId } from '@coaster/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { GetOrdersByBarIdQuery } from '../impl/get-orders-by-bar-id.query';
import { GetOrdersByBarIdHandler } from './get-orders-by-bar-id.handler';

describe('GetOrdersByBarIdHandler', () => {
  let handler: GetOrdersByBarIdHandler;
  const repository = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetOrdersByBarIdHandler, { provide: OrdersReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetOrdersByBarIdHandler>(GetOrdersByBarIdHandler);
  });

  it('should return orders by bar ID', async () => {
    const barId = asBarId('bar-1');
    repository.findByBarId.mockResolvedValue([]);

    const result = await handler.execute(new GetOrdersByBarIdQuery(barId));

    expect(repository.findByBarId).toHaveBeenCalledWith(barId, undefined);
    expect(result).toEqual([]);
  });
});
