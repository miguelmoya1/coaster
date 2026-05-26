import { asBarId, asOrderId, asProductId, Order } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdjustProductStockCommand } from '../../products/commands/adjust-product-stock/adjust-product-stock.command';
import { OrderCancelledEvent } from '../events/order-cancelled/order-cancelled.event';
import { OrderCreatedEvent } from '../events/order-created/order-created.event';
import { OrderItemRemovedEvent } from '../events/order-item-removed/order-item-removed.event';
import { OrderItemsAddedEvent } from '../events/order-items-added/order-items-added.event';
import { OrdersSagas } from './orders.sagas';

describe('OrdersSagas', () => {
  let sagas: OrdersSagas;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersSagas],
    }).compile();

    sagas = module.get<OrdersSagas>(OrdersSagas);
  });

  it('should map OrderCreatedEvent to AdjustProductStockCommand', async () => {
    const order = {
      id: asOrderId('order-1'),
      barId: asBarId('bar-1'),
      status: 'OPEN',
      totalAmount: 10,
      items: [
        { productId: asProductId('prod-1'), quantity: 2 },
        { productId: asProductId('prod-2'), quantity: 3 },
      ],
    };
    const event = new OrderCreatedEvent(asBarId('bar-1'), order as unknown as Order, null);

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([
      new AdjustProductStockCommand(asBarId('bar-1'), asProductId('prod-1'), -2),
      new AdjustProductStockCommand(asBarId('bar-1'), asProductId('prod-2'), -3),
    ]);
  });

  it('should map OrderItemsAddedEvent to AdjustProductStockCommand', async () => {
    const event = new OrderItemsAddedEvent(asBarId('bar-1'), {} as Order, [
      { productId: asProductId('prod-1'), quantity: 2 },
    ]);

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([new AdjustProductStockCommand(asBarId('bar-1'), asProductId('prod-1'), -2)]);
  });

  it('should map OrderItemRemovedEvent to AdjustProductStockCommand', async () => {
    const event = new OrderItemRemovedEvent(asBarId('bar-1'), {} as Order, {
      productId: asProductId('prod-1'),
      quantity: 4,
    });

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([new AdjustProductStockCommand(asBarId('bar-1'), asProductId('prod-1'), 4)]);
  });

  it('should map OrderCancelledEvent to AdjustProductStockCommand', async () => {
    const order = {
      items: [{ productId: asProductId('prod-1'), quantity: 2 }],
    };
    const event = new OrderCancelledEvent(asBarId('bar-1'), order as Order, null);

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([new AdjustProductStockCommand(asBarId('bar-1'), asProductId('prod-1'), 2)]);
  });
});
