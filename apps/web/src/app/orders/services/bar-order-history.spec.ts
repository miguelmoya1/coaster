import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarsStore } from '../../bars';
import { Socket } from '../../core';
import { OrderRepository } from '../data-access/order-repository';
import { BarOrderHistory } from './bar-order-history';

describe('BarOrderHistory', () => {
  let service: BarOrderHistory;
  let repository: OrderRepository;

  const currentBarId = signal(undefined);

  const barsStoreMock = {
    currentId: currentBarId.asReadonly(),
  };

  const socketMock = {
    orderCreated: signal(null),
    orderUpdated: signal(null),
    orderClosed: signal(null),
    orderCancelled: signal(null),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BarsStore, useValue: barsStoreMock },
        { provide: Socket, useValue: socketMock },
        BarOrderHistory,
        OrderRepository,
      ],
    });

    service = TestBed.inject(BarOrderHistory);
    repository = TestBed.inject(OrderRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct listByDate route', () => {
    const barId = asBarId('bar-1');
    expect(repository.routes.listByDate(barId, '2026-05-03')).toBe('/bars/bar-1/orders?date=2026-05-03');
  });

  describe('computed properties', () => {
    it('should have selectedDate set to today by default', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(service.selectedDate()).toBe(today);
    });

    it('should update selectedDate when setDate is called', () => {
      service.setDate('2026-01-15');
      expect(service.selectedDate()).toBe('2026-01-15');
    });

    it('should return 0 for totalClosed when no data', () => {
      expect(service.totalClosed()).toBe(0);
    });

    it('should return 0 for totalCancelled when no data', () => {
      expect(service.totalCancelled()).toBe(0);
    });

    it('should return 0 for totalRevenue when no data', () => {
      expect(service.totalRevenue()).toBe(0);
    });

    it('should return 0 for averageTicket when no data', () => {
      expect(service.averageTicket()).toBe(0);
    });
  });
});
