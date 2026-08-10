import { asEstablishmentId, asOrderId } from '@coaster/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentStats, Order } from '@coaster/common';
import { OrderStatus, PaymentMethod } from '@coaster/common';
import { Socket } from '@coaster/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StatsStore } from './stats-store';

describe('StatsStore', () => {
  let store: StatsStore;
  let httpMock: HttpTestingController;
  let mockSocket = {
    orderClosed: signal<Order | null>(null),
    orderCancelled: signal<{ id: string } | Order | null>(null),
    orderDeleted: signal<{ id: string } | null>(null),
  };

  const mockStats: EstablishmentStats = {
    todayRevenue: 100,
    yesterdayRevenue: 50,
    weeklyRevenue: 150,
    dailyRevenues: [],
    currentMonthRevenue: 150,
    previousMonthRevenue: 200,
    yearlyRevenue: 1000,
    monthlyBreakdown: [],
    percentageChange: 25,
    isPositiveChange: false,
    maxMonthRevenue: 200,
  };

  beforeEach(() => {
    mockSocket = {
      orderClosed: signal<Order | null>(null),
      orderCancelled: signal<{ id: string } | Order | null>(null),
      orderDeleted: signal<{ id: string } | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: Socket, useValue: mockSocket },
      ],
    });

    store = TestBed.inject(StatsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('stats loading', () => {
    it('should fetch stats when establishmentId is set', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      const req = httpMock.expectOne(`/establishments/${establishmentId}/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.stats.hasValue()).toBe(true);
      expect(store.stats.value()).toEqual(mockStats);
    });
  });

  describe('realtime reload via sockets', () => {
    it('should reload stats when orderClosed is received for current establishmentId', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      const req = httpMock.expectOne(`/establishments/${establishmentId}/stats`);
      req.flush(mockStats);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.stats.value()?.todayRevenue).toBe(100);

      mockSocket.orderClosed.set({
        id: asOrderId('ord-1'),
        establishmentId: asEstablishmentId('establishment-1'),
        status: OrderStatus.CLOSED,
        totalAmount: 100,
        amountPaidCash: 0,
        amountPaidCard: 0,
        paymentMethod: PaymentMethod.NONE,
        adjustments: [],
        tipAmount: 0,
        orderTotal: 100,
        payableTotal: 100,
        items: [],
      });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const reloadReq = httpMock.expectOne(`/establishments/${establishmentId}/stats`);
      expect(reloadReq.request.method).toBe('GET');
      reloadReq.flush({ ...mockStats, todayRevenue: 180 });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.stats.value()?.todayRevenue).toBe(180);
    });

    it('should NOT reload stats when orderClosed is for a different establishmentId', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      const req = httpMock.expectOne(`/establishments/${establishmentId}/stats`);
      req.flush(mockStats);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.orderClosed.set({
        id: asOrderId('ord-1'),
        establishmentId: asEstablishmentId('establishment-2'),
        status: OrderStatus.CLOSED,
        totalAmount: 100,
        amountPaidCash: 0,
        amountPaidCard: 0,
        paymentMethod: PaymentMethod.NONE,
        adjustments: [],
        tipAmount: 0,
        orderTotal: 100,
        payableTotal: 100,
        items: [],
      });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      httpMock.expectNone(`/establishments/${establishmentId}/stats`);
    });

    it('should reload stats when orderCancelled is received', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      const req = httpMock.expectOne(`/establishments/${establishmentId}/stats`);
      req.flush(mockStats);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.orderCancelled.set({
        id: asOrderId('ord-1'),
        establishmentId: asEstablishmentId('establishment-1'),
        status: OrderStatus.CANCELLED,
        totalAmount: 100,
        amountPaidCash: 0,
        amountPaidCard: 0,
        paymentMethod: PaymentMethod.NONE,
        adjustments: [],
        tipAmount: 0,
        orderTotal: 100,
        payableTotal: 100,
        items: [],
      });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const reloadReq = httpMock.expectOne(`/establishments/${establishmentId}/stats`);
      expect(reloadReq.request.method).toBe('GET');
      reloadReq.flush(mockStats);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();
    });
  });
});
