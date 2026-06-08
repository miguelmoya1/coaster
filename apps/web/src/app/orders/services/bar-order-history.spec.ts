import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { BarOrderHistory } from './bar-order-history';

describe('BarOrderHistory', () => {
  let service: BarOrderHistory;

  const orderRepoMock = {
    routes: {
      listByDate: vi.fn().mockReturnValue('/bars/bar-1/orders?date=2026-05-03'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: OrderRepository, useValue: orderRepoMock }],
    });

    service = TestBed.inject(BarOrderHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return undefined when barId is undefined', () => {
      expect(service.execute(undefined, '2026-05-03')).toBeUndefined();
    });

    it('should return undefined when date is undefined', () => {
      expect(service.execute(asBarId('bar-1'), undefined)).toBeUndefined();
    });

    it('should return route URL when barId and date are provided', () => {
      const result = service.execute(asBarId('bar-1'), '2026-05-03');
      expect(orderRepoMock.routes.listByDate).toHaveBeenCalledWith(asBarId('bar-1'), '2026-05-03');
      expect(result).toBe('/bars/bar-1/orders?date=2026-05-03');
    });
  });
});
