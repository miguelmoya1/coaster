import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Socket } from '@coaster/core';
import { ActiveOrdersStore, OrderHistoryStore } from '@coaster/orders';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderDetail from './order-detail';

describe('OrderDetail', () => {
  let component: OrderDetail;
  let fixture: ComponentFixture<OrderDetail>;

  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };

  const activeOrdersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    openOrders: vi.fn().mockReturnValue([]),
    getOrder: vi.fn().mockResolvedValue(null),
    bulkUpdate: vi.fn(),
    checkout: vi.fn(),
    cancel: vi.fn(),
    moveTable: vi.fn(),
    merge: vi.fn(),
    removeItem: vi.fn(),
    addItems: vi.fn(),
    reloadOrders: vi.fn(),
    setEstablishmentId: vi.fn(),
  };

  const orderHistoryStoreMock = {
    reloadHistory: vi.fn(),
    setEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
        { provide: ActiveOrdersStore, useValue: activeOrdersStoreMock },
        { provide: OrderHistoryStore, useValue: orderHistoryStoreMock },
        {
          provide: Socket,
          useValue: {
            tableStatusChanged: signal<any>(null),
            tableCreated: signal<any>(null),
            tableUpdated: signal<any>(null),
            tableDeleted: signal<any>(null),
          },
        },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(OrderDetail);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.componentRef.setInput('orderId', 'order-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should expose establishmentId with provided value', () => {
      expect(component.establishmentId()).toBe('establishment-1');
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
      expect(routerMock.navigate).toHaveBeenCalledWith(['/establishments', 'establishment-1', 'orders', 'tables']);
    });
  });
});
