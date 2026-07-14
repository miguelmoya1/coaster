import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { asBarId, Socket } from '@coaster/core';
import { OrderHistoryStore } from './order-history.store';
import { BarOrderHistory } from '../services/bar-order-history';
import { OrderStatus } from '@coaster/common';
import type { Order } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('OrderHistoryStore', () => {
  let store: OrderHistoryStore;

  const barOrderHistoryMock = {
    execute: vi.fn().mockResolvedValue([]),
  };

  const socketMock = {
    orderCreated: signal<Order | null>(null),
    orderUpdated: signal<Order | null>(null),
    orderClosed: signal<Order | null>(null),
    orderCancelled: signal<Order | null>(null),
    orderItemAdded: signal<Order | null>(null),
    orderDeleted: signal<{ id: string } | null>(null),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset signals
    socketMock.orderCreated.set(null);
    socketMock.orderUpdated.set(null);
    socketMock.orderClosed.set(null);
    socketMock.orderCancelled.set(null);
    socketMock.orderItemAdded.set(null);
    socketMock.orderDeleted.set(null);

    TestBed.configureTestingModule({
      providers: [
        OrderHistoryStore,
        { provide: BarOrderHistory, useValue: barOrderHistoryMock },
        { provide: Socket, useValue: socketMock },
      ],
    });

    store = TestBed.inject(OrderHistoryStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('setBarId and setHistoryDate', () => {
    it('should set currentBarId and historyDate and trigger history fetch', () => {
      store.setBarId(asBarId('bar-1'));
      store.setHistoryDate('2026-05-31');
      
      expect(store.selectedDate()).toBe('2026-05-31');
      
      TestBed.flushEffects();
      expect(barOrderHistoryMock.execute).toHaveBeenCalledWith('bar-1', '2026-05-31');
    });
  });

  describe('computed properties', () => {
    it('should calculate totals and average ticket correctly', () => {
      // Simulate resource loading data
      const mockOrders: any[] = [
        { id: '1', status: OrderStatus.CLOSED, totalAmount: 1000, orderTotal: 1000 },
        { id: '2', status: OrderStatus.CLOSED, totalAmount: 2000, orderTotal: 2000 },
        { id: '3', status: OrderStatus.CANCELLED, totalAmount: 500, orderTotal: 500 },
      ];
      
      // Override the internal resource value
      Object.defineProperty(store.history, 'value', { value: () => mockOrders });
      
      expect(store.totalOrders()).toBe(3);
      expect(store.totalClosed()).toBe(2);
      expect(store.totalCancelled()).toBe(1);
      expect(store.historyTotalRevenue()).toBe(3000);
      expect(store.averageTicket()).toBe(1500); // 3000 / 2
    });
  });
});
