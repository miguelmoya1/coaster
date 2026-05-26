import { asBarId, asOrderId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrdersRepository } from '../../data-access/orders.repository';
import { DeleteOrderCommand } from './delete-order.command';
import { DeleteOrderHandler } from './delete-order.handler';

describe('DeleteOrderHandler', () => {
  let handler: DeleteOrderHandler;
  const repository = {
    findById: vi.fn(),
    deleteOrder: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeleteOrderHandler, { provide: OrdersRepository, useValue: repository }],
    }).compile();

    handler = module.get<DeleteOrderHandler>(DeleteOrderHandler);
  });

  it('should throw BadRequestException if order is open', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(handler.execute(new DeleteOrderCommand(asBarId('bar-1'), asOrderId('order-1')))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should delete past-today closed order successfully', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'CLOSED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(new DeleteOrderCommand(asBarId('bar-1'), asOrderId('order-1')));

    expect(repository.deleteOrder).toHaveBeenCalledWith(asOrderId('order-1'));
  });
});
