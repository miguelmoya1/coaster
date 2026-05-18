import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OrdersStore } from '@coaster/orders';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderDetail from './order-detail';

describe('OrderDetail', () => {
  let component: OrderDetail;
  let fixture: ComponentFixture<OrderDetail>;

  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };

  const ordersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    openOrders: vi.fn().mockReturnValue([]),
    getOrder: vi.fn().mockResolvedValue(null),
    payItem: vi.fn(),
    deliverItem: vi.fn(),
    checkout: vi.fn(),
    cancel: vi.fn(),
    moveTable: vi.fn(),
    merge: vi.fn(),
    removeItem: vi.fn(),
    addItems: vi.fn(),
    reloadOrders: vi.fn(),
    reloadHistory: vi.fn(),
    setBarId: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: OrdersStore, useValue: ordersStoreMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(OrderDetail);
    fixture.componentRef.setInput('barId', 'bar-1');
    fixture.componentRef.setInput('orderId', 'order-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should expose barId with provided value', () => {
      expect(component.barId()).toBe('bar-1');
    });

    it('should expose orderId with provided value', () => {
      expect(component.orderId()).toBe('order-1');
    });
  });

  describe('computed properties', () => {
    it('should resolve orderId as OrderId', () => {
      expect(component.resolvedOrderId()).toBe('order-1');
    });

    it('should return null for currentOrder when no matching open order', () => {
      expect(component.currentOrder()).toBeNull();
    });
  });

  describe('actions', () => {
    it('should navigate back to tables on goBack', async () => {
      await component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/bars', 'bar-1', 'orders', 'tables']);
    });
  });
});
