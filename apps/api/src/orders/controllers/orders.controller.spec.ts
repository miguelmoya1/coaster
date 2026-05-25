import { asBarId, asOrderId, asOrderItemId, type Order } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { OrdersController } from './orders.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  CreateOrderCommand,
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CheckoutOrderCommand,
  CancelOrderCommand,
  MoveOrderTableCommand,
  MergeOrdersCommand,
  RemoveOrderItemCommand,
  DeleteOrderCommand
} from '../commands';
import { GetOrderByIdQuery, GetOrdersByBarIdQuery, GetOrdersByDateQuery } from '../queries';

describe('OrdersController', () => {
  let controller: OrdersController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getOrders should delegate to query bus for bar ID when no date is provided', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getOrders(asBarId('bar-1'), 'OPEN');

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetOrdersByBarIdQuery));
  });

  it('getOrders should delegate to query bus for date when date is provided', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getOrders(asBarId('bar-1'), undefined, '2026-05-01');

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetOrdersByDateQuery));
  });

  it('getOrder should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue({} as Order);

    await controller.getOrder(asBarId('bar-1'), asOrderId('order-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetOrderByIdQuery));
  });

  it('createOrder should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'order-1' });
    const dto = { items: [{ productId: 'prod-1', quantity: 2 }] };

    const result = await controller.createOrder(asBarId('bar-1'), dto as any);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateOrderCommand));
    expect(result).toEqual({ id: 'order-1' });
  });

  it('addItems should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };

    const result = await controller.addItems(asBarId('bar-1'), asOrderId('order-1'), dto as any);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(AddOrderItemsCommand));
    expect(result).toEqual({ success: true });
  });

  it('bulkUpdate should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { items: [{ itemId: 'item-1', paidQuantity: 2, servedQuantity: 1 }] };

    const result = await controller.bulkUpdate(asBarId('bar-1'), asOrderId('order-1'), dto as any);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUpdateOrderCommand));
    expect(result).toEqual({ success: true });
  });

  it('checkout should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const result = await controller.checkout(asBarId('bar-1'), asOrderId('order-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CheckoutOrderCommand));
    expect(result).toEqual({ success: true });
  });

  it('cancelOrder should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const result = await controller.cancelOrder(asBarId('bar-1'), asOrderId('order-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CancelOrderCommand));
    expect(result).toEqual({ success: true });
  });

  it('moveTable should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { tableId: 'table-2' };

    const result = await controller.moveTable(asBarId('bar-1'), asOrderId('order-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(MoveOrderTableCommand));
    expect(result).toEqual({ success: true });
  });

  it('removeItem should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const result = await controller.removeItem(asBarId('bar-1'), asOrderId('order-1'), asOrderItemId('item-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RemoveOrderItemCommand));
    expect(result).toEqual({ success: true });
  });

  it('mergeOrders should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { orderIds: ['order-1', 'order-2'] };

    const result = await controller.mergeOrders(asBarId('bar-1'), dto as any);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(MergeOrdersCommand));
    expect(result).toEqual({ success: true });
  });

  it('deleteOrder should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const result = await controller.deleteOrder(asBarId('bar-1'), asOrderId('order-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteOrderCommand));
    expect(result).toEqual({ success: true });
  });
});
