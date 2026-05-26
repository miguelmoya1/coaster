import { asBarId, asOrderId } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderCancelledEvent } from '../../events';
import { CancelOrderCommand } from './cancel-order.command';
import { CancelOrderHandler } from './cancel-order.handler';

describe('CancelOrderHandler', () => {
  let handler: CancelOrderHandler;
  const repository = {
    findById: vi.fn(),
    cancelOrder: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelOrderHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CancelOrderHandler>(CancelOrderHandler);
  });

  it('should cancel order and free table', async () => {
    repository.findById.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'OPEN',
      tableId: 'table-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.cancelOrder.mockResolvedValue({
      id: 'order-1',
      barId: 'bar-1',
      status: 'CANCELLED',
      tableId: 'table-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(new CancelOrderCommand(asBarId('bar-1'), asOrderId('order-1')));

    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrderCancelledEvent(asBarId('bar-1'), expect.any(Object), expect.any(String)),
    );
  });
});
