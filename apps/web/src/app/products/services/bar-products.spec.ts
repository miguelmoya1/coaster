import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, BarId, Product } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarsStore } from '../../bars';
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

  const mockProducts: Product[] = [
    {
      id: asProductId('prod-1'),
      categoryId: asCategoryId('cat-1'),
      name: 'Beer',
      price: 1050,
      currentStock: 10,
      minStockAlert: 5,
      stockStatus: 'good',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('prod-2'),
      categoryId: asCategoryId('cat-1'),
      name: 'Product 2',
      price: 1500,
      currentStock: 5,
      minStockAlert: 5,
      stockStatus: 'low',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('prod-3'),
      categoryId: asCategoryId('cat-2'),
      name: 'Product 3',
      price: 200,
      currentStock: 0,
      minStockAlert: 5,
      stockStatus: 'critical',
      lastUpdated: new Date().toISOString(),
    },
  ];

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

  describe('all', () => {
    it('should be idle at start', () => {
      expect(service.all.status()).toBe('idle');
    });

    it('should fetch products when bar context is set', async () => {
      const barId = asBarId('bar-1');
      currentBarId.set(barId);
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);

      httpMock.expectOne(`/bars/${barId}/products`).flush(mockProducts);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.hasValue()).toBe(true);
      expect(service.all.value()).toEqual(mockProducts);
    });
  });

  describe('computed signals', () => {
    it('should calculate total, lowStock, and criticalStock correctly', async () => {
      const barId = asBarId('bar-1');
      currentBarId.set(barId);
      TestBed.tick();

      httpMock.expectOne(`/bars/${barId}/products`).flush(mockProducts);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.total()).toBe(3);
      expect(service.lowStock()).toBe(1);
      expect(service.criticalStock()).toBe(1);
    });

    it('should return undefined if no value yet', () => {
      expect(service.total()).toBeUndefined();
      expect(service.lowStock()).toBeUndefined();
      expect(service.criticalStock()).toBeUndefined();
    });
  });

  describe('reload', () => {
    it('should reload the products', async () => {
      const barId = asBarId('bar-1');
      currentBarId.set(barId);
      TestBed.tick();

      httpMock.expectOne(`/bars/${barId}/products`).flush(mockProducts);
      await TestBed.inject(ApplicationRef).whenStable();

      service.reload();
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);

      httpMock.expectOne(`/bars/${barId}/products`).flush([]);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.value()).toEqual([]);
    });
  });
});
