import { asBarId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderCreatedEvent } from '../../events';
import { CreateOrderCommand } from './create-order.command';
import { CreateOrderHandler } from './create-order.handler';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  const repository = {
    findProductsByIds: vi.fn(),
    findTableById: vi.fn(),
    createOrder: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateOrderHandler>(CreateOrderHandler);
  });

  const barId = asBarId('bar-1');
  const dto = { items: [{ productId: 'prod-1', quantity: 2 }], tableId: 'table-1' };

  it('should throw NotFoundException if products not found', async () => {
    repository.findProductsByIds.mockResolvedValue([]);

    await expect(handler.execute(new CreateOrderCommand(barId, dto))).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if table is occupied', async () => {
    repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 2 }]);
    repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'OCCUPIED' });

    await expect(handler.execute(new CreateOrderCommand(barId, dto))).rejects.toThrow(BadRequestException);
  });

  it('should create order and publish event', async () => {
    repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 2 }]);
    repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'FREE', name: 'Mesa 1' });
    repository.createOrder.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      totalAmount: 4,
      tableId: 'table-1',
      tableName: 'Mesa 1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new CreateOrderCommand(barId, dto));

    expect(result.id).toBe('order-1');
    expect(eventBus.publish).toHaveBeenCalledWith(new OrderCreatedEvent(barId, expect.any(Object), expect.any(String)));
  });
});
