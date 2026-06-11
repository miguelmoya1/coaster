import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { OrdersStore } from './orders-store';

describe('OrdersStore', () => {
  let service: OrdersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideTranslateService()],
    });
    service = TestBed.inject(OrdersStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
