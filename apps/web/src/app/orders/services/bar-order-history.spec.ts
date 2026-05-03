import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { BarOrderHistory } from './bar-order-history';

describe('BarOrderHistory', () => {
  let service: BarOrderHistory;
  let repository: OrderRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BarOrderHistory, OrderRepository],
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
});
