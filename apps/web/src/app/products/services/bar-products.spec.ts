import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BarsStore } from '@coaster/bars';
import { BarId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { BarProducts } from './bar-products';

describe('BarProducts', () => {
  let service: BarProducts;
  let httpMock: HttpTestingController;

  const currentBarId = signal<BarId | undefined>(undefined);

  const barsStoreMock = {
    currentId: currentBarId.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      list: vi.fn((barId: string) => `/bars/${barId}/products`),
    },
  };

  beforeEach(() => {
    currentBarId.set(undefined);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: BarsStore, useValue: barsStoreMock },
        { provide: ProductRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(BarProducts);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
