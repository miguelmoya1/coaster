import { asBarId, asOrderId, asOrderItemId, type Order } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { OrdersService } from '../services/orders.service';
import { OrdersController } from './orders.controller';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: Mocked<OrdersService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getOrdersByBarId: vi.fn(),
      getOrderById: vi.fn(),
      createOrder: vi.fn(),
      addItems: vi.fn(),
      payItem: vi.fn(),
      deliverItem: vi.fn(),
      checkout: vi.fn(),
      cancelOrder: vi.fn(),
      moveTable: vi.fn(),
      mergeOrders: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService);
  });

  it('getOrders should delegate to the service', async () => {
    service.getOrdersByBarId.mockResolvedValue([]);

    await controller.getOrders(asBarId('bar-1'), 'OPEN');

    expect(service.getOrdersByBarId).toHaveBeenCalledWith('bar-1', 'OPEN');
  });

  it('getOrder should delegate to the service', async () => {
    service.getOrderById.mockResolvedValue({} as Order);

    await controller.getOrder(asBarId('bar-1'), asOrderId('order-1'));

    expect(service.getOrderById).toHaveBeenCalledWith('bar-1', 'order-1');
  });

  it('createOrder should delegate to the service', async () => {
    service.createOrder.mockResolvedValue({} as Order);
    const dto = { items: [{ productId: 'prod-1', quantity: 2 }] };

    await controller.createOrder(asBarId('bar-1'), dto);

    expect(service.createOrder).toHaveBeenCalledWith('bar-1', dto);
  });

  it('addItems should delegate to the service', async () => {
    service.addItems.mockResolvedValue({} as Order);
    const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };

    await controller.addItems(asBarId('bar-1'), asOrderId('order-1'), dto);

    expect(service.addItems).toHaveBeenCalledWith('bar-1', 'order-1', dto);
  });

  it('payItem should delegate to the service', async () => {
    service.payItem.mockResolvedValue({} as Order);

    await controller.payItem(asBarId('bar-1'), asOrderId('order-1'), asOrderItemId('item-1'));

    expect(service.payItem).toHaveBeenCalledWith('bar-1', 'order-1', 'item-1');
  });

  it('deliverItem should delegate to the service', async () => {
    service.deliverItem.mockResolvedValue({} as Order);

    await controller.deliverItem(asBarId('bar-1'), asOrderId('order-1'), asOrderItemId('item-1'));

    expect(service.deliverItem).toHaveBeenCalledWith('bar-1', 'order-1', 'item-1');
  });

  it('checkout should delegate to the service', async () => {
    service.checkout.mockResolvedValue({} as Order);

    await controller.checkout(asBarId('bar-1'), asOrderId('order-1'));

    expect(service.checkout).toHaveBeenCalledWith('bar-1', 'order-1');
  });

  it('cancelOrder should delegate to the service', async () => {
    service.cancelOrder.mockResolvedValue({} as Order);

    await controller.cancelOrder(asBarId('bar-1'), asOrderId('order-1'));

    expect(service.cancelOrder).toHaveBeenCalledWith('bar-1', 'order-1');
  });

  it('moveTable should delegate to the service', async () => {
    service.moveTable.mockResolvedValue({} as Order);
    const dto = { tableId: 'table-2' };

    await controller.moveTable(asBarId('bar-1'), asOrderId('order-1'), dto);

    expect(service.moveTable).toHaveBeenCalledWith('bar-1', 'order-1', dto);
  });

  it('mergeOrders should delegate to the service', async () => {
    service.mergeOrders.mockResolvedValue({} as Order);
    const dto = { orderIds: ['order-1', 'order-2'] };

    await controller.mergeOrders(asBarId('bar-1'), dto);

    expect(service.mergeOrders).toHaveBeenCalledWith('bar-1', dto);
  });
});
