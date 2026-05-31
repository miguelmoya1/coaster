import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  asBarId,
  asOrderId,
  asOrderItemId,
  asProductId,
  DeliveryStatus,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from '@coaster/common';
import { OrdersStore } from '@coaster/orders';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToServe from './to-serve';

describe('ToServe', () => {
  let component: ToServe;
  let fixture: ComponentFixture<ToServe>;

  const openOrdersSignal = signal<Order[]>([]);

  const ordersStoreMock = {
    openOrders: openOrdersSignal,
    setBarId: vi.fn(),
    bulkUpdate: vi.fn(),
  };

  beforeEach(async () => {
    openOrdersSignal.set([]);
    await TestBed.configureTestingModule({
      imports: [ToServe],
      providers: [provideTranslateService(), provideRouter([]), { provide: OrdersStore, useValue: ordersStoreMock }],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(ToServe);
    fixture.componentRef.setInput('barId', asBarId('bar-1'));
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set bar ID on the store', () => {
    fixture.detectChanges();
    expect(ordersStoreMock.setBarId).toHaveBeenCalledWith(asBarId('bar-1'));
  });

  describe('ordersToServe filtering and sorting', () => {
    const mockOrderItem = (id: string, qty: number, served: number, timeStr: string): OrderItem => ({
      id: asOrderItemId(id),
      orderId: asOrderId('order-1'),
      productId: asProductId('prod-1'),
      productName: 'Product ' + id,
      quantity: qty,
      servedQuantity: served,
      paidQuantity: 0,
      priceAtPurchase: 100,
      paymentStatus: PaymentStatus.PENDING,
      deliveryStatus: DeliveryStatus.PENDING,
      createdAt: timeStr,
      updatedAt: timeStr,
    });

    const mockOrder = (id: string, timeStr: string, items: OrderItem[]): Order => ({
      id: asOrderId(id),
      barId: asBarId('bar-1'),
      status: OrderStatus.OPEN,
      totalAmount: 1000,
      items,
      createdAt: timeStr,
      updatedAt: timeStr,
    });

    it('should filter out orders that are fully served', () => {
      const order1 = mockOrder('order-1', '2026-05-31T10:00:00Z', [
        mockOrderItem('item-1', 2, 2, '2026-05-31T10:00:00Z'),
      ]);
      const order2 = mockOrder('order-2', '2026-05-31T10:05:00Z', [
        mockOrderItem('item-2', 3, 1, '2026-05-31T10:05:00Z'),
      ]);

      openOrdersSignal.set([order1, order2]);
      fixture.detectChanges();

      const result = component['ordersToServe']();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('order-2');
      expect(result[0].items.length).toBe(1);
      expect(result[0].items[0].id).toBe('item-2');
    });

    it('should sort orders by oldest first (FIFO)', () => {
      const orderNewer = mockOrder('order-newer', '2026-05-31T10:10:00Z', [
        mockOrderItem('item-new', 1, 0, '2026-05-31T10:10:00Z'),
      ]);
      const orderOlder = mockOrder('order-older', '2026-05-31T10:00:00Z', [
        mockOrderItem('item-old', 1, 0, '2026-05-31T10:00:00Z'),
      ]);

      openOrdersSignal.set([orderNewer, orderOlder]);
      fixture.detectChanges();

      const result = component['ordersToServe']();
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('order-older');
      expect(result[1].id).toBe('order-newer');
    });
  });

  describe('selection and serving actions', () => {
    const item1: OrderItem = {
      id: asOrderItemId('item-1'),
      orderId: asOrderId('order-1'),
      productId: asProductId('prod-1'),
      productName: 'Prod 1',
      quantity: 3,
      servedQuantity: 0,
      paidQuantity: 0,
      priceAtPurchase: 100,
      paymentStatus: PaymentStatus.PENDING,
      deliveryStatus: DeliveryStatus.PENDING,
      createdAt: '2026-05-31T10:00:00Z',
      updatedAt: '2026-05-31T10:00:00Z',
    };

    const item2: OrderItem = {
      id: asOrderItemId('item-2'),
      orderId: asOrderId('order-2'),
      productId: asProductId('prod-2'),
      productName: 'Prod 2',
      quantity: 2,
      servedQuantity: 1,
      paidQuantity: 0,
      priceAtPurchase: 200,
      paymentStatus: PaymentStatus.PENDING,
      deliveryStatus: DeliveryStatus.PENDING,
      createdAt: '2026-05-31T10:01:00Z',
      updatedAt: '2026-05-31T10:01:00Z',
    };

    it('should toggle selection correctly and initialize serveQty to remaining', () => {
      expect(component['isItemSelected']('item-1')).toBe(false);

      component['toggleSelectItem']('order-1', item1);
      expect(component['isItemSelected']('item-1')).toBe(true);
      expect(component['totalSelectedItemsCount']()).toBe(1);
      expect(component['selectedItems']().get('item-1')?.serveQty).toBe(3);

      component['toggleSelectItem']('order-1', item1);
      expect(component['isItemSelected']('item-1')).toBe(false);
      expect(component['totalSelectedItemsCount']()).toBe(0);
    });

    it('should adjust serveQty with updateSelectedQty', () => {
      component['toggleSelectItem']('order-1', item1);
      expect(component['selectedItems']().get('item-1')?.serveQty).toBe(3);

      component['updateSelectedQty']('item-1', 2);
      expect(component['selectedItems']().get('item-1')?.serveQty).toBe(2);

      component['updateSelectedQty']('item-1', 1);
      expect(component['selectedItems']().get('item-1')?.serveQty).toBe(1);
    });

    it('should serve single item directly', async () => {
      ordersStoreMock.bulkUpdate.mockResolvedValue({});

      await component['serveSingleItem']('order-1', item1);

      expect(ordersStoreMock.bulkUpdate).toHaveBeenCalledWith(asBarId('bar-1'), asOrderId('order-1'), {
        items: [{ itemId: asOrderItemId('item-1'), servedQuantity: 3 }],
      });
    });

    it('should apply bulk serve partially across orders', async () => {
      ordersStoreMock.bulkUpdate.mockResolvedValue({});

      component['toggleSelectItem']('order-1', item1);
      component['toggleSelectItem']('order-2', item2);

      component['updateSelectedQty']('item-1', 2);

      await component['applySelectedChanges']();

      expect(ordersStoreMock.bulkUpdate).toHaveBeenCalledTimes(2);
      expect(ordersStoreMock.bulkUpdate).toHaveBeenCalledWith(asBarId('bar-1'), asOrderId('order-1'), {
        items: [{ itemId: asOrderItemId('item-1'), servedQuantity: 2 }],
      });
      expect(ordersStoreMock.bulkUpdate).toHaveBeenCalledWith(asBarId('bar-1'), asOrderId('order-2'), {
        items: [{ itemId: asOrderItemId('item-2'), servedQuantity: 2 }],
      });
      expect(component['totalSelectedItemsCount']()).toBe(0);
    });
  });
});
