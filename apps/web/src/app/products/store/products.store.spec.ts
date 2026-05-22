import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product } from '@coaster/common';
import { Socket } from '@coaster/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductsStore } from './products.store';

describe('ProductsStore', () => {
  let store: ProductsStore;
  let httpMock: HttpTestingController;
  let mockSocket = {
    productCreated: signal<Product | null>(null),
    productStockChanged: signal<Product | null>(null),
    productDeleted: signal<{ id: string } | null>(null),
  };

  const mockProducts: Product[] = [
    {
      id: asProductId('p-1'),
      name: 'Vodka Superior',
      price: 1500,
      currentStock: 10,
      minStockAlert: 5,
      stockStatus: 'good',
      categoryId: asCategoryId('cat-1'),
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('p-2'),
      name: 'Ron Barato',
      price: 1200,
      currentStock: 3,
      minStockAlert: 5,
      stockStatus: 'low',
      categoryId: asCategoryId('cat-2'),
      lastUpdated: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    mockSocket = {
      productCreated: signal<Product | null>(null),
      productStockChanged: signal<Product | null>(null),
      productDeleted: signal<{ id: string } | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: Socket, useValue: mockSocket },
      ],
    });

    store = TestBed.inject(ProductsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('list', () => {
    it('should fetch products when barId is set', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const req = httpMock.expectOne(`/bars/${barId}/products`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.hasValue()).toBe(true);
      expect(store.list.value()).toEqual(mockProducts);
    });
  });

  describe('update', () => {
    it('should update the product in the list without duplicating it', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const getReq = httpMock.expectOne(`/bars/${barId}/products`);
      getReq.flush(mockProducts);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.value()?.length).toBe(2);

      const updatedProduct: Product = {
        ...mockProducts[0],
        name: 'Vodka Premium Extra',
        price: 1800,
      };

      const updatePromise = store.update(mockProducts[0].id, {
        name: 'Vodka Premium Extra',
        price: 1800,
      });

      const patchReq = httpMock.expectOne(`/bars/${barId}/products/${mockProducts[0].id}`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush(updatedProduct);
      TestBed.tick();

      await updatePromise;
      TestBed.tick();

      const list = store.list.value();
      expect(list?.length).toBe(2); // Should NOT duplicate!
      expect(list?.[0].name).toBe('Vodka Premium Extra');
      expect(list?.[0].price).toBe(1800);
      expect(list?.[1]).toEqual(mockProducts[1]); // The other product remains unchanged
    });
  });

  describe('updateStock', () => {
    it('should update the product stock in the list without duplicating it', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const getReq = httpMock.expectOne(`/bars/${barId}/products`);
      getReq.flush(mockProducts);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.value()?.length).toBe(2);

      const updatedProduct: Product = {
        ...mockProducts[0],
        currentStock: 15,
      };

      const updateStockPromise = store.updateStock(mockProducts[0].id, {
        currentStock: 15,
      });

      const patchReq = httpMock.expectOne(`/bars/${barId}/products/${mockProducts[0].id}/stock`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush(updatedProduct);
      TestBed.tick();

      await updateStockPromise;
      TestBed.tick();

      const list = store.list.value();
      expect(list?.length).toBe(2); // Should NOT duplicate!
      expect(list?.[0].currentStock).toBe(15);
      expect(list?.[1]).toEqual(mockProducts[1]); // The other product remains unchanged
    });
  });
});
