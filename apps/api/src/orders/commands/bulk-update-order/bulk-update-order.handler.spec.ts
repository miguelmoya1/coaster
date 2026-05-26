import { asBarId, asOrderId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { BulkUpdateOrderCommand } from './bulk-update-order.command';
import { BulkUpdateOrderHandler } from './bulk-update-order.handler';

describe('BulkUpdateOrderHandler', () => {
  let handler: BulkUpdateOrderHandler;
  const repository = {
    findById: vi.fn(),
    bulkUpdate: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUpdateOrderHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<BulkUpdateOrderHandler>(BulkUpdateOrderHandler);
  });

  const barId = asBarId('bar-1');
  const orderId = asOrderId('order-1');
  const dto = { items: [{ itemId: 'item-1', paidQuantity: 2, servedQuantity: 1 }] };

  it('should throw NotFoundException if order item not found', async () => {
    repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', items: [] });

    await expect(handler.execute(new BulkUpdateOrderCommand(barId, orderId, dto))).rejects.toThrow(NotFoundException);
  });
});
