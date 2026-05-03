import { asBarId, asOrderId, asOrderItemId, ErrorCodes, SocketEvents } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../core';
import { OrdersRepository } from '../data-access/orders.repository';
import { OrdersService } from './orders.service';

const makeOrderDb = (overrides: Record<string, any> = {}) => ({
  id: 'order-1',
  barId: 'bar-1',
  tableId: 'table-1',
  status: 'OPEN',
  totalAmount: 500,
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'prod-1',
      quantity: 2,
      priceAtPurchase: 250,
      paymentStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      product: { name: 'Cerveza' },
      createdAt: new Date('2026-05-01T08:00:00Z'),
      updatedAt: new Date('2026-05-01T08:00:00Z'),
    },
  ],
  table: { name: 'Mesa 1' },
  createdAt: new Date('2026-05-01T08:00:00Z'),
  updatedAt: new Date('2026-05-01T08:00:00Z'),
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;
  let repository = {
    prisma: {
      $transaction: vi.fn(),
      orderItem: { update: vi.fn() },
    },
    findByBarId: vi.fn(),
    findById: vi.fn(),
    findProductsByIds: vi.fn(),
    findTableById: vi.fn(),
    findOrdersByIds: vi.fn(),
    findItemById: vi.fn(),
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
        OrdersService,
        { provide: OrdersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repository = module.get(OrdersRepository);
    vi.clearAllMocks();
    barGateway.server.to.mockReturnThis();
  });

  describe('getOrdersByBarId', () => {
    it('should return mapped orders', async () => {
      const barId = asBarId('bar-1');
      repository.findByBarId.mockResolvedValue([makeOrderDb()]);

      const result = await service.getOrdersByBarId(barId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(asOrderId('order-1'));
    });

    it('should pass status filter', async () => {
      const barId = asBarId('bar-1');
      repository.findByBarId.mockResolvedValue([]);

      await service.getOrdersByBarId(barId, 'OPEN');

      expect(repository.findByBarId).toHaveBeenCalledWith(barId, 'OPEN');
    });
  });

  describe('getOrderById', () => {
    it('should return the order when found', async () => {
      const barId = asBarId('bar-1');
      const orderId = asOrderId('order-1');
      repository.findById.mockResolvedValue(makeOrderDb());

      const result = await service.getOrderById(barId, orderId);

      expect(result.id).toBe(orderId);
    });

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getOrderById(asBarId('bar-1'), asOrderId('order-1'))).rejects.toThrow(NotFoundException);
    });

    it('should throw if order belongs to different bar', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ barId: 'bar-other' }));

      await expect(service.getOrderById(asBarId('bar-1'), asOrderId('order-1'))).rejects.toThrow(
        ErrorCodes.ORDER_NOT_FOUND,
      );
    });
  });

  describe('createOrder', () => {
    const barId = asBarId('bar-1');
    const dto = {
      tableId: 'table-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
    };

    it('should throw if products not found', async () => {
      repository.findProductsByIds.mockResolvedValue([]);

      await expect(service.createOrder(barId, dto)).rejects.toThrow(ErrorCodes.PRODUCT_NOT_FOUND);
    });

    it('should throw if table not found', async () => {
      repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 250 }]);
      repository.findTableById.mockResolvedValue(null);

      await expect(service.createOrder(barId, dto)).rejects.toThrow(ErrorCodes.TABLE_NOT_FOUND);
    });

    it('should throw if table is already occupied', async () => {
      repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 250 }]);
      repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'OCCUPIED' });

      await expect(service.createOrder(barId, dto)).rejects.toThrow(ErrorCodes.TABLE_ALREADY_OCCUPIED);
    });

    it('should create order with items in a transaction', async () => {
      repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 250 }]);
      repository.findTableById.mockResolvedValue({ id: 'table-1', barId: 'bar-1', status: 'FREE' });
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          order: { create: vi.fn().mockResolvedValue(makeOrderDb()) },
          table: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.createOrder(barId, dto);

      expect(result.id).toBe(asOrderId('order-1'));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CREATED, result);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
        id: 'table-1',
        status: 'OCCUPIED',
      });
    });

    it('should create order without table (bar order)', async () => {
      const barDto = { items: [{ productId: 'prod-1', quantity: 1 }] };
      repository.findProductsByIds.mockResolvedValue([{ id: 'prod-1', price: 300 }]);
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          order: { create: vi.fn().mockResolvedValue(makeOrderDb({ tableId: null, table: null })) },
        };
        return fn(tx);
      });

      const result = await service.createOrder(barId, barDto);

      expect(result.tableId).toBeUndefined();
    });
  });

  describe('addItems', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ productId: 'prod-2', quantity: 1 }] };

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.addItems(barId, orderId, dto)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if order is not open', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ status: 'CLOSED' }));

      await expect(service.addItems(barId, orderId, dto)).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    });

    it('should throw if products not found', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      repository.findProductsByIds.mockResolvedValue([]);

      await expect(service.addItems(barId, orderId, dto)).rejects.toThrow(ErrorCodes.PRODUCT_NOT_FOUND);
    });

    it('should add items and update total in a transaction', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      repository.findProductsByIds.mockResolvedValue([{ id: 'prod-2', price: 150 }]);
      const updatedOrder = makeOrderDb({ totalAmount: 650 });
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          orderItem: { createMany: vi.fn() },
          order: { update: vi.fn().mockResolvedValue(updatedOrder) },
        };
        return fn(tx);
      });

      const result = await service.addItems(barId, orderId, dto);

      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_ITEM_ADDED, result);
    });
  });

  describe('payItem', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const itemId = asOrderItemId('item-1');

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.payItem(barId, orderId, itemId)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if order is not open', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ status: 'CLOSED' }));

      await expect(service.payItem(barId, orderId, itemId)).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    });

    it('should throw if item not found in order', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ items: [] }));

      await expect(service.payItem(barId, orderId, itemId)).rejects.toThrow(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    });

    it('should throw if item already paid', async () => {
      const order = makeOrderDb();
      order.items[0].paymentStatus = 'PAID';
      repository.findById.mockResolvedValue(order);

      await expect(service.payItem(barId, orderId, itemId)).rejects.toThrow(ErrorCodes.ORDER_ALREADY_PAID);
    });

    it('should mark item as paid and emit event', async () => {
      repository.findById
        .mockResolvedValueOnce(makeOrderDb())
        .mockResolvedValueOnce(makeOrderDb());
      repository.prisma.orderItem.update.mockResolvedValue({});

      const result = await service.payItem(barId, orderId, itemId);

      expect(repository.prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: { paymentStatus: 'PAID' },
      });
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, result);
    });
  });

  describe('deliverItem', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const itemId = asOrderItemId('item-1');

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deliverItem(barId, orderId, itemId)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if item not found in order', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ items: [] }));

      await expect(service.deliverItem(barId, orderId, itemId)).rejects.toThrow(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    });

    it('should mark item as served and emit event', async () => {
      repository.findById
        .mockResolvedValueOnce(makeOrderDb())
        .mockResolvedValueOnce(makeOrderDb());
      repository.prisma.orderItem.update.mockResolvedValue({});

      const result = await service.deliverItem(barId, orderId, itemId);

      expect(repository.prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: { deliveryStatus: 'SERVED' },
      });
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, result);
    });
  });

  describe('checkout', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.checkout(barId, orderId)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if order is not open', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ status: 'CLOSED' }));

      await expect(service.checkout(barId, orderId)).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    });

    it('should close order, pay all items and free table in a transaction', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      const closedOrder = makeOrderDb({ status: 'CLOSED' });
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          orderItem: {
            updateMany: vi.fn(),
            findMany: vi.fn().mockResolvedValue([{ priceAtPurchase: 250, quantity: 2 }]),
          },
          order: { update: vi.fn().mockResolvedValue(closedOrder) },
          table: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.checkout(barId, orderId);

      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CLOSED, result);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
        id: 'table-1',
        status: 'FREE',
      });
    });

    it('should not emit table event when there is no table', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ tableId: null }));
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          orderItem: {
            updateMany: vi.fn(),
            findMany: vi.fn().mockResolvedValue([]),
          },
          order: { update: vi.fn().mockResolvedValue(makeOrderDb({ tableId: null, table: null, status: 'CLOSED' })) },
        };
        return fn(tx);
      });

      await service.checkout(barId, orderId);

      const tableEmitCalls = barGateway.server.emit.mock.calls.filter(
        (c: any[]) => c[0] === SocketEvents.TABLE_STATUS_CHANGED,
      );
      expect(tableEmitCalls).toHaveLength(0);
    });
  });

  describe('cancelOrder', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.cancelOrder(barId, orderId)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if order is not open', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ status: 'CANCELLED' }));

      await expect(service.cancelOrder(barId, orderId)).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    });

    it('should cancel order and free table in a transaction', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      const cancelledOrder = makeOrderDb({ status: 'CANCELLED' });
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          order: { update: vi.fn().mockResolvedValue(cancelledOrder) },
          table: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.cancelOrder(barId, orderId);

      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, result);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
        id: 'table-1',
        status: 'FREE',
      });
    });
  });

  describe('moveTable', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { tableId: 'table-2' };

    it('should throw if order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.moveTable(barId, orderId, dto)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if order is not open', async () => {
      repository.findById.mockResolvedValue(makeOrderDb({ status: 'CLOSED' }));

      await expect(service.moveTable(barId, orderId, dto)).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    });

    it('should throw if new table not found', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      repository.findTableById.mockResolvedValue(null);

      await expect(service.moveTable(barId, orderId, dto)).rejects.toThrow(ErrorCodes.TABLE_NOT_FOUND);
    });

    it('should throw if new table is occupied', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      repository.findTableById.mockResolvedValue({ id: 'table-2', barId: 'bar-1', status: 'OCCUPIED' });

      await expect(service.moveTable(barId, orderId, dto)).rejects.toThrow(ErrorCodes.TABLE_ALREADY_OCCUPIED);
    });

    it('should move order to new table in a transaction', async () => {
      repository.findById.mockResolvedValue(makeOrderDb());
      repository.findTableById.mockResolvedValue({ id: 'table-2', barId: 'bar-1', status: 'FREE' });
      const movedOrder = makeOrderDb({ tableId: 'table-2', table: { name: 'Mesa 2' } });
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          table: { update: vi.fn() },
          order: { update: vi.fn().mockResolvedValue(movedOrder) },
        };
        return fn(tx);
      });

      const result = await service.moveTable(barId, orderId, dto);

      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, result);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
        id: 'table-1',
        status: 'FREE',
      });
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_STATUS_CHANGED, {
        id: 'table-2',
        status: 'OCCUPIED',
      });
    });
  });

  describe('mergeOrders', () => {
    const barId = asBarId('bar-1');
    const dto = { orderIds: ['order-1', 'order-2'] };

    it('should throw if not all orders found', async () => {
      repository.findOrdersByIds.mockResolvedValue([makeOrderDb()]);

      await expect(service.mergeOrders(barId, dto)).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    });

    it('should throw if any order belongs to another bar', async () => {
      repository.findOrdersByIds.mockResolvedValue([
        makeOrderDb({ id: 'order-1' }),
        makeOrderDb({ id: 'order-2', barId: 'bar-other' }),
      ]);

      await expect(service.mergeOrders(barId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if any order is not open', async () => {
      repository.findOrdersByIds.mockResolvedValue([
        makeOrderDb({ id: 'order-1' }),
        makeOrderDb({ id: 'order-2', status: 'CLOSED' }),
      ]);

      await expect(service.mergeOrders(barId, dto)).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    });

    it('should merge orders in a transaction', async () => {
      const order1 = makeOrderDb({ id: 'order-1', tableId: 'table-1' });
      const order2 = makeOrderDb({ id: 'order-2', tableId: 'table-2' });
      repository.findOrdersByIds.mockResolvedValue([order1, order2]);
      const mergedOrder = makeOrderDb({ id: 'order-1', totalAmount: 1000 });
      repository.prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx = {
          orderItem: {
            updateMany: vi.fn(),
            findMany: vi.fn().mockResolvedValue([
              { priceAtPurchase: 250, quantity: 2 },
              { priceAtPurchase: 250, quantity: 2 },
            ]),
          },
          order: { update: vi.fn().mockResolvedValue(mergedOrder) },
          table: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.mergeOrders(barId, dto);

      expect(result.id).toBe(asOrderId('order-1'));
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_UPDATED, result);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.ORDER_CANCELLED, { id: 'order-2' });
    });
  });
});
