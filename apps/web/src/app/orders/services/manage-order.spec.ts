import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Order } from '@coaster/common';
import { asBarId, asOrderId, asOrderItemId, asProductId, asTableId, DeliveryStatus, OrderStatus, PaymentStatus } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { ManageOrder } from './manage-order';

describe('ManageOrder', () => {
  let service: ManageOrder;

  const orderRepoMock = {
    addItems: vi.fn(),
    bulkUpdate: vi.fn(),
    checkout: vi.fn(),
    cancel: vi.fn(),
    moveTable: vi.fn(),
    merge: vi.fn(),
    removeItem: vi.fn(),
    getOrder: vi.fn(),
    create: vi.fn(),
  };

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
        paidQuantity: 0,
        servedQuantity: 0,
      },
    ],
  };

  const barId = asBarId('bar-1');
  const orderId = asOrderId('order-1');

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OrderRepository, useValue: orderRepoMock },
      ],
    });

    service = TestBed.inject(ManageOrder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addItems', () => {
    it('should delegate to repository', async () => {
      const dto = { items: [{ productId: asProductId('prod-2'), quantity: 3 }] };
      orderRepoMock.addItems.mockResolvedValue(mockOrder);

      const result = await service.addItems(barId, orderId, dto);

      expect(orderRepoMock.addItems).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('bulkUpdate', () => {
    it('should delegate to repository', async () => {
      const dto = { items: [{ itemId: asOrderItemId('item-1'), paidQuantity: 2, servedQuantity: 1 }] };
      orderRepoMock.bulkUpdate.mockResolvedValue(mockOrder);

      const result = await service.bulkUpdate(barId, orderId, dto);

      expect(orderRepoMock.bulkUpdate).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('checkout', () => {
    it('should delegate to repository', async () => {
      orderRepoMock.checkout.mockResolvedValue(mockOrder);

      const result = await service.checkout(barId, orderId);

      expect(orderRepoMock.checkout).toHaveBeenCalledWith(barId, orderId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancel', () => {
    it('should delegate to repository', async () => {
      orderRepoMock.cancel.mockResolvedValue(mockOrder);

      const result = await service.cancel(barId, orderId);

      expect(orderRepoMock.cancel).toHaveBeenCalledWith(barId, orderId);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('moveTable', () => {
    it('should delegate to repository', async () => {
      const dto = { tableId: asTableId('table-2') };
      orderRepoMock.moveTable.mockResolvedValue(mockOrder);

      const result = await service.moveTable(barId, orderId, dto);

      expect(orderRepoMock.moveTable).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('merge', () => {
    it('should delegate to repository', async () => {
      const dto = { orderIds: [asOrderId('o1'), asOrderId('o2')] };
      orderRepoMock.merge.mockResolvedValue(mockOrder);

      const result = await service.merge(barId, dto);

      expect(orderRepoMock.merge).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockOrder);
    });
  });
});
