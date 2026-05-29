import { asBarId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { GetOrdersByBarIdHandler } from './get-orders-by-bar-id.handler';
import { GetOrdersByBarIdQuery } from './get-orders-by-bar-id.query';

describe('GetOrdersByBarIdHandler', () => {
  let handler: GetOrdersByBarIdHandler;
  const repository = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetOrdersByBarIdHandler, { provide: OrdersRepository, useValue: repository }],
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
