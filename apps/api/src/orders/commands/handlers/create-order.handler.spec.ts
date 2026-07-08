import type { Order, TableId } from '@coaster/common';
import { OrderStatus, TableStatus } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asProductId, asTableId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderCreatedEvent } from '../../events';
import { CreateOrderCommand } from '../impl/create-order.command';
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
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: OrdersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<CreateOrderHandler>(CreateOrderHandler);
  });

  const barId = asBarId('bar-1');
  const dto = { items: [{ productId: asProductId('prod-1'), quantity: 2 }], tableId: asTableId('table-1') };

  it('should throw NotFoundException if products not found', async () => {
    repository.findProductsByIds.mockResolvedValue([]);

    await expect(handler.execute(new CreateOrderCommand(barId, dto))).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if table is occupied', async () => {
    repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 2 }]);
    repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: TableStatus.OCCUPIED });

    await expect(handler.execute(new CreateOrderCommand(barId, dto))).rejects.toThrow(BadRequestException);
  });

  it('should create order and publish event', async () => {
    repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 2 }]);
    repository.findTableById.mockResolvedValue({
      id: 'table-1',
      barId: 'bar-1',
      status: TableStatus.FREE,
      name: 'Mesa 1',
    });
    repository.createOrder.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: OrderStatus.OPEN,
      totalAmount: 4,
      tableId: 'table-1',
      tableName: 'Mesa 1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new CreateOrderCommand(barId, dto));

    expect(result).toBeUndefined();
    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrderCreatedEvent(barId, expect.any(Object) as unknown as Order, expect.any(String) as unknown as TableId),
    );
  });
});
