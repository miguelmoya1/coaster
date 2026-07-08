import { OrderStatus } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderDeletedEvent } from '../../events';
import { DeleteOrderCommand } from '../impl/delete-order.command';
import { DeleteOrderHandler } from './delete-order.handler';

describe('DeleteOrderHandler', () => {
  let handler: DeleteOrderHandler;
  const repository = {
    findById: vi.fn(),
    deleteOrder: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOrderHandler,
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: OrdersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<DeleteOrderHandler>(DeleteOrderHandler);
  });

  it('should throw BadRequestException if order is open', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: OrderStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(handler.execute(new DeleteOrderCommand(asBarId('bar-1'), asOrderId('order-1')))).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should delete today's closed order successfully", async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: OrderStatus.CLOSED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(new DeleteOrderCommand(asBarId('bar-1'), asOrderId('order-1')));

    expect(repository.deleteOrder).toHaveBeenCalledWith(asOrderId('order-1'));
    expect(eventBus.publish).toHaveBeenCalledWith(new OrderDeletedEvent(asBarId('bar-1'), asOrderId('order-1')));
  });
});
