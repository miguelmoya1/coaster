import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Order } from '@coaster/common';
import { OrderStatus, PaymentMethod } from '@coaster/common';
import { asBarId, asOrderId, Socket, Toast } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarOrders } from '../services/bar-orders';
import { CreateOrder } from '../services/create-order';
import { DeleteOrder } from '../services/delete-order';
import { ManageOrder } from '../services/manage-order';
import { PrintOrder } from '../services/print-order';
import { ActiveOrdersStore } from './active-orders.store';

describe('ActiveOrdersStore', () => {
  let store: ActiveOrdersStore;

  const barOrdersMock = {
    execute: vi.fn().mockResolvedValue([]),
  };
  const createOrderMock = {
    execute: vi.fn().mockResolvedValue(undefined),
  };
  const deleteOrderMock = {
    execute: vi.fn().mockResolvedValue(undefined),
  };
  const manageOrderMock = {
    getOrder: vi.fn().mockResolvedValue(null),
    addItems: vi.fn().mockResolvedValue(undefined),
    bulkUpdate: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    moveTable: vi.fn().mockResolvedValue(undefined),
    merge: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  };
  const printOrderMock = {
    execute: vi.fn().mockResolvedValue(undefined),
  };
  const socketMock = {
    orderCreated: signal<Order | null>(null),
    orderUpdated: signal<Order | null>(null),
    orderClosed: signal<Order | null>(null),
    orderCancelled: signal<Order | null>(null),
    orderItemAdded: signal<Order | null>(null),
    orderDeleted: signal<{ id: string } | null>(null),
  };
  const toastMock = {
    error: vi.fn(),
    success: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    socketMock.orderCreated.set(null);
    socketMock.orderUpdated.set(null);
    socketMock.orderClosed.set(null);
    socketMock.orderCancelled.set(null);
    socketMock.orderItemAdded.set(null);
    socketMock.orderDeleted.set(null);

    TestBed.configureTestingModule({
      providers: [
        ActiveOrdersStore,
        { provide: BarOrders, useValue: barOrdersMock },
        { provide: CreateOrder, useValue: createOrderMock },
        { provide: DeleteOrder, useValue: deleteOrderMock },
        { provide: ManageOrder, useValue: manageOrderMock },
        { provide: PrintOrder, useValue: printOrderMock },
        { provide: Socket, useValue: socketMock },
        { provide: Toast, useValue: toastMock },
      ],
    });

    store = TestBed.inject(ActiveOrdersStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('setBarId', () => {
    it('should set currentBarId and trigger list fetch', () => {
      expect(store.currentBarId()).toBeUndefined();
      store.setBarId(asBarId('bar-1'));
      expect(store.currentBarId()).toBe('bar-1');
      TestBed.tick();
      expect(barOrdersMock.execute).toHaveBeenCalledWith('bar-1', OrderStatus.OPEN);
    });
  });

  describe('actions', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should create order and handle error', async () => {
      createOrderMock.execute.mockRejectedValueOnce(new Error('Test error'));
      await expect(store.create(barId, { items: [] })).rejects.toThrow('Test error');
    });

    it('should call manageOrder.addItems and handle success', async () => {
      await store.addItems(barId, orderId, { items: [] });
      expect(manageOrderMock.addItems).toHaveBeenCalledWith(barId, orderId, { items: [] });
    });

    it('should call manageOrder.bulkUpdate and handle success', async () => {
      await store.bulkUpdate(barId, orderId, { items: [] });
      expect(manageOrderMock.bulkUpdate).toHaveBeenCalledWith(barId, orderId, { items: [] });
    });

    it('should propagate manageOrder errors', async () => {
      manageOrderMock.checkout.mockRejectedValueOnce(new Error('Checkout error'));
      await expect(store.checkout(barId, orderId, PaymentMethod.CASH)).rejects.toThrow('Checkout error');
    });
  });
});
