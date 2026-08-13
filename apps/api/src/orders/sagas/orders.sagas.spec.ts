import type { Order } from '@coaster/common';
import { asEstablishmentId, asOrderId, asProductId, OrderStatus } from '@coaster/common';
import { AdjustProductStockCommand } from '@coaster/products';
import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrderCancelledEvent, OrderCreatedEvent, OrderItemRemovedEvent, OrderItemsAddedEvent } from '../events';
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
      establishmentId: asEstablishmentId('establishment-1'),
      status: OrderStatus.OPEN,
      totalAmount: 10,
      items: [
        { productId: asProductId('prod-1'), quantity: 2 },
        { productId: asProductId('prod-2'), quantity: 3 },
      ],
    };
    const event = new OrderCreatedEvent(asEstablishmentId('establishment-1'), order as unknown as Order, null);

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([
      new AdjustProductStockCommand(asEstablishmentId('establishment-1'), asProductId('prod-1'), -2),
      new AdjustProductStockCommand(asEstablishmentId('establishment-1'), asProductId('prod-2'), -3),
    ]);
  });

  it('should map OrderItemsAddedEvent to AdjustProductStockCommand', async () => {
    const event = new OrderItemsAddedEvent(asEstablishmentId('establishment-1'), {} as Order, [
      { productId: asProductId('prod-1'), quantity: 2 },
    ]);

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([
      new AdjustProductStockCommand(asEstablishmentId('establishment-1'), asProductId('prod-1'), -2),
    ]);
  });

  it('should map OrderItemRemovedEvent to AdjustProductStockCommand', async () => {
    const event = new OrderItemRemovedEvent(asEstablishmentId('establishment-1'), {} as Order, {
      productId: asProductId('prod-1'),
      quantity: 4,
    });

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([
      new AdjustProductStockCommand(asEstablishmentId('establishment-1'), asProductId('prod-1'), 4),
    ]);
  });

  it('should map OrderCancelledEvent to AdjustProductStockCommand', async () => {
    const order = {
      items: [{ productId: asProductId('prod-1'), quantity: 2 }],
    };
    const event = new OrderCancelledEvent(asEstablishmentId('establishment-1'), order as Order, null);

    const result = await firstValueFrom(sagas.handleStockManagement(of(event)).pipe(toArray()));

    expect(result).toEqual([
      new AdjustProductStockCommand(asEstablishmentId('establishment-1'), asProductId('prod-1'), 2),
    ]);
  });
});
