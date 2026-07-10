import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId } from '@coaster/core';
import { Socket } from '@coaster/core';
import { Product } from '@coaster/products';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductsStore } from './products.store';

describe('ProductsStore', () => {
  let store: ProductsStore;
  let httpMock: HttpTestingController;
  let mockSocket = {
    productCreated: signal<Product | null>(null),
    productStockChanged: signal<Product | null>(null),
    productDeleted: signal<{ id: string } | null>(null),
    productUpdated: signal<Product | null>(null),
  };

  const mockProductsRaw = [
    {
      id: asProductId('p-1'),
      name: 'Vodka Superior',
      price: 1500,
      currentStock: 10,
      minStockAlert: 5,
      categoryId: asCategoryId('cat-1'),
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('p-2'),
      name: 'Ron Barato',
      price: 1200,
      currentStock: 3,
      minStockAlert: 5,
      categoryId: asCategoryId('cat-2'),
      lastUpdated: new Date().toISOString(),
    },
  ];

  const mockProducts: Product[] = [
    {
      ...mockProductsRaw[0],
      stockStatus: 'GOOD',
    },
    {
      ...mockProductsRaw[1],
      stockStatus: 'WARNING',
    },
  ];

  beforeEach(() => {
    mockSocket = {
      productCreated: signal<Product | null>(null),
      productStockChanged: signal<Product | null>(null),
      productDeleted: signal<{ id: string } | null>(null),
      productUpdated: signal<Product | null>(null),
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
      req.flush(mockProductsRaw);
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
      getReq.flush(mockProductsRaw);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.value()?.length).toBe(2);

      const updatePromise = store.update(mockProducts[0].id, {
        name: 'Vodka Premium Extra',
        price: 1800,
      });

      const patchReq = httpMock.expectOne(`/bars/${barId}/products/${mockProducts[0].id}`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush({ success: true });

      // Wait for repository PATCH promise to resolve and local update to execute
      TestBed.tick();
      await Promise.resolve();
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
      getReq.flush(mockProductsRaw);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.list.value()?.length).toBe(2);

      const updateStockPromise = store.updateStock(mockProducts[0].id, {
        currentStock: 15,
      });

      const patchReq = httpMock.expectOne(`/bars/${barId}/products/${mockProducts[0].id}/stock`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush({ success: true });

      // Wait for repository PATCH promise to resolve and local update to execute
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      await updateStockPromise;
      TestBed.tick();

      const list = store.list.value();
      expect(list?.length).toBe(2); // Should NOT duplicate!
      expect(list?.[0].currentStock).toBe(15);
      expect(list?.[1]).toEqual(mockProducts[1]); // The other product remains unchanged
    });
  });

  describe('delete', () => {
    it('should delete the product from the list', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const getReq = httpMock.expectOne(`/bars/${barId}/products`);
      getReq.flush(mockProductsRaw);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const deletePromise = store.delete(mockProducts[0].id);

      const deleteReq = httpMock.expectOne(`/bars/${barId}/products/${mockProducts[0].id}`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ success: true });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      await deletePromise;

      const list = store.list.value();
      expect(list?.length).toBe(1);
      expect(list?.[0].id).toBe(mockProducts[1].id);
    });

    it('should return error if no bar selected', async () => {
      store.setBarId(null);
      await expect(store.delete(mockProducts[0].id)).rejects.toThrow('MISSING_BAR_ID');
    });
  });

  describe('create', () => {
    it('should call create and reload', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      
      const createPromise = store.create({ name: 'New', price: 100 } as any);
      const createReq = httpMock.expectOne(`/bars/${barId}/products`);
      expect(createReq.request.method).toBe('POST');
      createReq.flush({ id: 'new-1' });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();
      
      const reloadReq = httpMock.expectOne(`/bars/${barId}/products`);
      reloadReq.flush(mockProductsRaw);
      
      await createPromise;
    });

    it('should return error if no bar selected', async () => {
      store.setBarId(null);
      await expect(store.create({ name: 'New', price: 100 } as any)).rejects.toThrow('MISSING_BAR_ID');
    });
  });

  describe('computed properties', () => {
    it('should compute total, lowStock, and criticalStock', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const getReq = httpMock.expectOne(`/bars/${barId}/products`);
      getReq.flush([
        { ...mockProductsRaw[0], currentStock: 10, minStockAlert: 5 }, // GOOD
        { ...mockProductsRaw[1], currentStock: 5, minStockAlert: 5 },  // WARNING
        { id: 'p-3', currentStock: 0, minStockAlert: 5, categoryId: 'cat-3', name: 'Alert' } // ALERT
      ]);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.total()).toBe(3);
      expect(store.lowStock()).toBe(1);
      expect(store.criticalStock()).toBe(1);
    });
  });

  describe('socket effects', () => {
    it('should handle productCreated socket event', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const getReq = httpMock.expectOne(`/bars/${barId}/products`);
      getReq.flush(mockProductsRaw);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.productCreated.set({ ...mockProducts[0], id: asProductId('new-sock-1') } as any);
      TestBed.tick();
      
      expect(store.list.value()?.length).toBe(3);
    });

    it('should handle productDeleted socket event', async () => {
      const barId = asBarId('bar-1');
      store.setBarId(barId);
      TestBed.tick();

      const getReq = httpMock.expectOne(`/bars/${barId}/products`);
      getReq.flush(mockProductsRaw);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.productDeleted.set({ id: mockProducts[0].id });
      TestBed.tick();
      
      expect(store.list.value()?.length).toBe(1);
      expect(store.list.value()?.[0].id).toBe(mockProducts[1].id);
    });
  });
});
