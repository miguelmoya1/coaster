import { asBarId, asOrderId, asOrderItemId, asProductId, asTableId, ErrorCodes, SocketEvents } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../core';
import { OrdersRepository } from './data-access/orders.repository';
import { GetOrdersByBarIdHandler } from './queries/get-orders-by-bar-id/get-orders-by-bar-id.handler';
import { GetOrdersByBarIdQuery } from './queries';
import { GetOrdersByDateHandler } from './queries/get-orders-by-date/get-orders-by-date.handler';
import { GetOrdersByDateQuery } from './queries';
import { GetOrderByIdHandler } from './queries/get-order-by-id/get-order-by-id.handler';
import { GetOrderByIdQuery } from './queries';
import { CreateOrderHandler } from './commands/create-order/create-order.handler';
import { CreateOrderCommand } from './commands';
import { AddOrderItemsHandler } from './commands/add-order-items/add-order-items.handler';
import { AddOrderItemsCommand } from './commands';
import { BulkUpdateOrderHandler } from './commands/bulk-update-order/bulk-update-order.handler';
import { BulkUpdateOrderCommand } from './commands';
import { CheckoutOrderHandler } from './commands/checkout-order/checkout-order.handler';
import { CheckoutOrderCommand } from './commands';
import { CancelOrderHandler } from './commands/cancel-order/cancel-order.handler';
import { CancelOrderCommand } from './commands';
import { MoveOrderTableHandler } from './commands/move-order-table/move-order-table.handler';
import { MoveOrderTableCommand } from './commands';
import { MergeOrdersHandler } from './commands/merge-orders/merge-orders.handler';
import { MergeOrdersCommand } from './commands';
import { RemoveOrderItemHandler } from './commands/remove-order-item/remove-order-item.handler';
import { RemoveOrderItemCommand } from './commands';
import { DeleteOrderHandler } from './commands/delete-order/delete-order.handler';
import { DeleteOrderCommand } from './commands';

describe('Orders Handlers', () => {
  let getOrdersHandler: GetOrdersByBarIdHandler;
  let getOrdersByDateHandler: GetOrdersByDateHandler;
  let getOrderByIdHandler: GetOrderByIdHandler;
  let createOrderHandler: CreateOrderHandler;
  let addItemsHandler: AddOrderItemsHandler;
  let bulkUpdateHandler: BulkUpdateOrderHandler;
  let checkoutHandler: CheckoutOrderHandler;
  let cancelHandler: CancelOrderHandler;
  let moveTableHandler: MoveOrderTableHandler;
  let mergeOrdersHandler: MergeOrdersHandler;
  let removeItemHandler: RemoveOrderItemHandler;
  let deleteOrderHandler: DeleteOrderHandler;

  let repository = {
    findByBarId: vi.fn(),
    findByBarIdAndDate: vi.fn(),
    findById: vi.fn(),
    deleteOrder: vi.fn(),
    findProductsByIds: vi.fn(),
    findTableById: vi.fn(),
    createOrder: vi.fn(),
    addItemsToOrder: vi.fn(),
    bulkUpdate: vi.fn(),
    checkoutOrder: vi.fn(),
    cancelOrder: vi.fn(),
    moveTable: vi.fn(),
    findOrdersByIds: vi.fn(),
    mergeOrders: vi.fn(),
    removeLastItemAndCancel: vi.fn(),
    removeItemAndRecalculate: vi.fn(),
  };

  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrdersByBarIdHandler,
        GetOrdersByDateHandler,
        GetOrderByIdHandler,
        CreateOrderHandler,
        AddOrderItemsHandler,
        BulkUpdateOrderHandler,
        CheckoutOrderHandler,
        CancelOrderHandler,
        MoveOrderTableHandler,
        MergeOrdersHandler,
        RemoveOrderItemHandler,
        DeleteOrderHandler,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    getOrdersHandler = module.get<GetOrdersByBarIdHandler>(GetOrdersByBarIdHandler);
    getOrdersByDateHandler = module.get<GetOrdersByDateHandler>(GetOrdersByDateHandler);
    getOrderByIdHandler = module.get<GetOrderByIdHandler>(GetOrderByIdHandler);
    createOrderHandler = module.get<CreateOrderHandler>(CreateOrderHandler);
    addItemsHandler = module.get<AddOrderItemsHandler>(AddOrderItemsHandler);
    bulkUpdateHandler = module.get<BulkUpdateOrderHandler>(BulkUpdateOrderHandler);
    checkoutHandler = module.get<CheckoutOrderHandler>(CheckoutOrderHandler);
    cancelHandler = module.get<CancelOrderHandler>(CancelOrderHandler);
    moveTableHandler = module.get<MoveOrderTableHandler>(MoveOrderTableHandler);
    mergeOrdersHandler = module.get<MergeOrdersHandler>(MergeOrdersHandler);
    removeItemHandler = module.get<RemoveOrderItemHandler>(RemoveOrderItemHandler);
    deleteOrderHandler = module.get<DeleteOrderHandler>(DeleteOrderHandler);
    repository = module.get(OrdersRepository);
  });

  describe('GetOrdersByBarIdHandler', () => {
    it('should return orders by bar ID', async () => {
      const barId = asBarId('bar-1');
      repository.findByBarId.mockResolvedValue([]);
      const result = await getOrdersHandler.execute(new GetOrdersByBarIdQuery(barId));
      expect(repository.findByBarId).toHaveBeenCalledWith(barId, undefined);
      expect(result).toEqual([]);
    });
  });

  describe('GetOrdersByDateHandler', () => {
    it('should return orders by date', async () => {
      const barId = asBarId('bar-1');
      repository.findByBarIdAndDate.mockResolvedValue([]);
      const result = await getOrdersByDateHandler.execute(new GetOrdersByDateQuery(barId, '2026-05-01'));
      expect(repository.findByBarIdAndDate).toHaveBeenCalledWith(barId, '2026-05-01');
      expect(result).toEqual([]);
    });
  });

  describe('GetOrderByIdHandler', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(getOrderByIdHandler.execute(new GetOrderByIdQuery(asBarId('bar-1'), asOrderId('order-1')))).rejects.toThrow(NotFoundException);
    });

    it('should return mapped order', async () => {
      repository.findById.mockResolvedValue({
        id: 'order-1',
        barId: 'bar-1',
        status: 'OPEN',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await getOrderByIdHandler.execute(new GetOrderByIdQuery(asBarId('bar-1'), asOrderId('order-1')));
      expect(result.id).toBe('order-1');
    });
  });

  describe('CreateOrderHandler', () => {
    const barId = asBarId('bar-1');
    const dto = { items: [{ productId: 'prod-1', quantity: 2 }], tableId: 'table-1' };

    it('should throw NotFoundException if products not found', async () => {
      repository.findProductsByIds.mockResolvedValue([]);
      await expect(createOrderHandler.execute(new CreateOrderCommand(barId, dto))).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if table is occupied', async () => {
      repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 2 }]);
      repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'OCCUPIED' });
      await expect(createOrderHandler.execute(new CreateOrderCommand(barId, dto))).rejects.toThrow(BadRequestException);
    });

    it('should create order and update table status', async () => {
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

      const result = await createOrderHandler.execute(new CreateOrderCommand(barId, dto));
      expect(result.id).toBe('order-1');
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CREATED, expect.any(Object));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'OCCUPIED' });
    });
  });

  describe('AddOrderItemsHandler', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };

    it('should throw NotFoundException if order not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(addItemsHandler.execute(new AddOrderItemsCommand(barId, orderId, dto))).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is not open', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED' });
      await expect(addItemsHandler.execute(new AddOrderItemsCommand(barId, orderId, dto))).rejects.toThrow(BadRequestException);
    });
  });

  describe('BulkUpdateOrderHandler', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ itemId: 'item-1', paidQuantity: 2, servedQuantity: 1 }] };

    it('should throw NotFoundException if order item not found', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', items: [] });
      await expect(bulkUpdateHandler.execute(new BulkUpdateOrderCommand(barId, orderId, dto))).rejects.toThrow(NotFoundException);
    });
  });

  describe('CheckoutOrderHandler', () => {
    it('should checkout order and free table', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
      repository.checkoutOrder.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

      await checkoutHandler.execute(new CheckoutOrderCommand(asBarId('bar-1'), asOrderId('order-1')));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CLOSED, expect.any(Object));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'FREE' });
    });
  });

  describe('CancelOrderHandler', () => {
    it('should cancel order and free table', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
      repository.cancelOrder.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CANCELLED', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

      await cancelHandler.execute(new CancelOrderCommand(asBarId('bar-1'), asOrderId('order-1')));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, expect.any(Object));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'FREE' });
    });
  });

  describe('MoveOrderTableHandler', () => {
    it('should move table and update statuses', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });
      repository.findTableById.mockResolvedValue({ id: 'table-2', barId: 'bar-1', status: 'FREE', name: 'Mesa 2' });
      repository.moveTable.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-2', items: [], createdAt: new Date(), updatedAt: new Date() });

      await moveTableHandler.execute(new MoveOrderTableCommand(asBarId('bar-1'), asOrderId('order-1'), { tableId: 'table-2' }));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-1', status: 'FREE' });
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, { id: 'table-2', status: 'OCCUPIED' });
    });
  });

  describe('MergeOrdersHandler', () => {
    it('should merge orders', async () => {
      repository.findOrdersByIds.mockResolvedValue([
        { id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() },
        { id: 'order-2', barId: 'bar-1', status: 'OPEN', tableId: 'table-2', items: [], createdAt: new Date(), updatedAt: new Date() },
      ]);
      repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'OCCUPIED' });
      repository.mergeOrders.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', tableId: 'table-1', items: [], createdAt: new Date(), updatedAt: new Date() });

      await mergeOrdersHandler.execute(new MergeOrdersCommand(asBarId('bar-1'), { orderIds: ['order-1', 'order-2'], targetTableId: 'table-1' }));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, expect.any(Object));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, { id: 'order-2' });
    });
  });

  describe('RemoveOrderItemHandler', () => {
    it('should remove item', async () => {
      const order = {
        id: 'order-1',
        barId: 'bar-1',
        status: 'OPEN',
        tableId: 'table-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          { id: 'item-1', orderId: 'order-1', productId: 'p1', quantity: 1, priceAtPurchase: 2, product: { name: 'P1' }, createdAt: new Date(), updatedAt: new Date(), paymentStatus: 'PENDING', deliveryStatus: 'PENDING' },
          { id: 'item-2', orderId: 'order-1', productId: 'p2', quantity: 1, priceAtPurchase: 3, product: { name: 'P2' }, createdAt: new Date(), updatedAt: new Date(), paymentStatus: 'PENDING', deliveryStatus: 'PENDING' },
        ],
      };
      repository.findById.mockResolvedValue(order);
      repository.removeItemAndRecalculate.mockResolvedValue({
        ...order,
        items: [order.items[1]],
      });

      await removeItemHandler.execute(new RemoveOrderItemCommand(asBarId('bar-1'), asOrderId('order-1'), asOrderItemId('item-1')));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, expect.any(Object));
    });
  });

  describe('DeleteOrderHandler', () => {
    it('should throw BadRequestException if order is open', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'OPEN', createdAt: new Date(), updatedAt: new Date() });
      await expect(deleteOrderHandler.execute(new DeleteOrderCommand(asBarId('bar-1'), asOrderId('order-1')))).rejects.toThrow(BadRequestException);
    });

    it('should delete past-today closed order successfully', async () => {
      repository.findById.mockResolvedValue({ id: 'order-1', barId: 'bar-1', status: 'CLOSED', createdAt: new Date(), updatedAt: new Date() });
      await deleteOrderHandler.execute(new DeleteOrderCommand(asBarId('bar-1'), asOrderId('order-1')));
      expect(repository.deleteOrder).toHaveBeenCalledWith(asOrderId('order-1'));
    });
  });
});
