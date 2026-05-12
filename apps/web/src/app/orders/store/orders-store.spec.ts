import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { OrdersStore } from './orders-store';

describe('OrdersStore', () => {
  let service: OrdersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrdersStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
