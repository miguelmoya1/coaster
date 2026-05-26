import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddOrderItemsHandler } from './add-order-items.handler';
import { AddOrderItemsCommand } from './add-order-items.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { EventBus } from '@nestjs/cqrs';
import { asBarId, asOrderId } from '@coaster/common';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AddOrderItemsHandler', () => {
  let handler: AddOrderItemsHandler;
  let repository = {
    findById: vi.fn(),
    findProductsByIds: vi.fn(),
    addItemsToOrder: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddOrderItemsHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<AddOrderItemsHandler>(AddOrderItemsHandler);
  });

  const barId = asBarId('bar-1');
  const orderId = asOrderId('order-1');
  const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };

  it('should throw NotFoundException if order not found', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new AddOrderItemsCommand(barId, orderId, dto))
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if order is not open', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED' });

    await expect(
      handler.execute(new AddOrderItemsCommand(barId, orderId, dto))
    ).rejects.toThrow(BadRequestException);
  });
});
