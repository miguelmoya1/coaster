import { asBarId, asOrderId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { GetOrderByIdHandler } from './get-order-by-id.handler';
import { GetOrderByIdQuery } from './get-order-by-id.query';

describe('GetOrderByIdHandler', () => {
  let handler: GetOrderByIdHandler;
  const repository = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetOrderByIdHandler, { provide: OrdersRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetOrderByIdHandler>(GetOrderByIdHandler);
  });

  it('should throw NotFoundException if order does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(handler.execute(new GetOrderByIdQuery(asBarId('bar-1'), asOrderId('order-1')))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return mapped order', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new GetOrderByIdQuery(asBarId('bar-1'), asOrderId('order-1')));

    expect(result.id).toBe('order-1');
  });
});
