import { asEstablishmentId } from '@coaster/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { EstablishmentOrderHistory } from './establishment-order-history';

describe('EstablishmentOrderHistory', () => {
  let service: EstablishmentOrderHistory;

  const orderRepoMock = {
    routes: {
      listByDate: vi.fn().mockReturnValue('/establishments/establishment-1/orders?date=2026-05-03'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: OrderRepository, useValue: orderRepoMock }],
    });

    service = TestBed.inject(EstablishmentOrderHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return undefined when establishmentId is undefined', () => {
      expect(service.execute(undefined, '2026-05-03')).toBeUndefined();
    });

    it('should return undefined when date is undefined', () => {
      expect(service.execute(asEstablishmentId('establishment-1'), undefined)).toBeUndefined();
    });

    it('should return route URL when establishmentId and date are provided', () => {
      const result = service.execute(asEstablishmentId('establishment-1'), '2026-05-03');
      expect(orderRepoMock.routes.listByDate).toHaveBeenCalledWith(asEstablishmentId('establishment-1'), '2026-05-03');
      expect(result).toBe('/establishments/establishment-1/orders?date=2026-05-03');
    });
  });
});
