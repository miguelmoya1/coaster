import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asOrderId,
  asOrderItemId,
  asProductId,
  DeliveryStatus,
  Order,
  OrderStatus,
  PaymentStatus,
} from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { ManageOrder } from './manage-order';

describe('ManageOrder', () => {
  let service: ManageOrder;
  let orderRepoMock: Record<string, Mock>;

  const mockOrder: Order = {
    id: asOrderId('order-1'),
    barId: asBarId('bar-1'),
    status: OrderStatus.OPEN,
    totalAmount: 1000,
    items: [
      {
        id: asOrderItemId('item-1'),
        orderId: asOrderId('order-1'),
        productId: asProductId('prod-1'),
        quantity: 1,
        priceAtPurchase: 1000,
        paymentStatus: PaymentStatus.PENDING,
        deliveryStatus: DeliveryStatus.PENDING,
      },
    ],
  };

  const barId = asBarId('bar-1');
  const orderId = asOrderId('order-1');
  const itemId = asOrderItemId('item-1');

  beforeEach(() => {
    orderRepoMock = {
      addItems: vi.fn(),
      payItem: vi.fn(),
      deliverItem: vi.fn(),
      checkout: vi.fn(),
      cancel: vi.fn(),
      moveTable: vi.fn(),
      merge: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: OrderRepository, useValue: orderRepoMock }],
    });

    service = TestBed.inject(ManageOrder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addItems', () => {
    it('should delegate to repository', async () => {
      const dto = { items: [{ productId: 'prod-2', quantity: 3 }] };
      orderRepoMock['addItems'].mockResolvedValue(mockOrder);

      const result = await service.addItems(barId, orderId, dto);

      expect(orderRepoMock['addItems']).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('payItem', () => {
    it('should delegate to repository', async () => {
      orderRepoMock['payItem'].mockResolvedValue(mockOrder);

      const result = await service.payItem(barId, orderId, itemId);

      expect(orderRepoMock['payItem']).toHaveBeenCalledWith(barId, orderId, itemId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('deliverItem', () => {
    it('should delegate to repository', async () => {
      orderRepoMock['deliverItem'].mockResolvedValue(mockOrder);

      const result = await service.deliverItem(barId, orderId, itemId);

      expect(orderRepoMock['deliverItem']).toHaveBeenCalledWith(barId, orderId, itemId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('checkout', () => {
    it('should delegate to repository', async () => {
      orderRepoMock['checkout'].mockResolvedValue(mockOrder);

      const result = await service.checkout(barId, orderId);

      expect(orderRepoMock['checkout']).toHaveBeenCalledWith(barId, orderId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancel', () => {
    it('should delegate to repository', async () => {
      orderRepoMock['cancel'].mockResolvedValue(mockOrder);

      const result = await service.cancel(barId, orderId);

      expect(orderRepoMock['cancel']).toHaveBeenCalledWith(barId, orderId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('moveTable', () => {
    it('should delegate to repository', async () => {
      const dto = { tableId: 'table-2' };
      orderRepoMock['moveTable'].mockResolvedValue(mockOrder);

      const result = await service.moveTable(barId, orderId, dto);

      expect(orderRepoMock['moveTable']).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('merge', () => {
    it('should delegate to repository', async () => {
      const dto = { orderIds: ['o1', 'o2'] };
      orderRepoMock['merge'].mockResolvedValue(mockOrder);

      const result = await service.merge(barId, dto);

      expect(orderRepoMock['merge']).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockOrder);
    });
  });
});
