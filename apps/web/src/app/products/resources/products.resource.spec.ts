import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId } from '@coaster/common';
import { asEstablishmentId } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../models/product.interface';
import { stockCounts } from '../utils/stock-counts';
import { productsResource } from './products.resource';

const establishmentId = asEstablishmentId('establishment-1');

const product = (id: string, currentStock = 10, minStockAlert = 2) => ({
  id,
  name: `Producto ${id}`,
  price: 100,
  categoryId: 'category-1',
  currentStock,
  minStockAlert,
});

describe('productsResource', () => {
  let http: HttpTestingController;

  const realtime = {
    productCreated: signal<unknown>(null),
    productUpdated: signal<unknown>(null),
    productStockChanged: signal<unknown>(null),
    productDeleted: signal<{ id: string } | null>(null),
    catalogueImported: signal<{ establishmentId: string } | null>(null),
  };

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });

    http = TestBed.inject(HttpTestingController);
  });

  const loadedWith = async (body: unknown[]) => {
    const products = TestBed.runInInjectionContext(() =>
      productsResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    http.expectOne(`/establishments/${establishmentId}/products`).flush(body);
    await vi.waitFor(() => expect(products.hasValue()).toBe(true));
    return products;
  };

  it('should follow stock as the floor sells', async () => {
    const products = await loadedWith([product('1')]);

    realtime.productStockChanged.set(product('1', 1));
    TestBed.tick();

    expect(products.value()?.[0].currentStock).toBe(1);
  });

  it('should add and remove products other devices create and delete', async () => {
    const products = await loadedWith([product('1')]);

    realtime.productCreated.set(product('2'));
    TestBed.tick();
    realtime.productDeleted.set({ id: '1' });
    TestBed.tick();

    expect(products.value()?.map((p) => p.id)).toEqual(['2']);
  });

  it('should fetch everything again when a catalogue is imported', async () => {
    await loadedWith([product('1')]);

    realtime.catalogueImported.set({ establishmentId });
    TestBed.tick();

    http.expectOne(`/establishments/${establishmentId}/products`);
  });

  it('should count products by how much stock they have left', () => {
    const counts = stockCounts([
      { stockStatus: 'OK' },
      { stockStatus: 'WARNING' },
      { stockStatus: 'ALERT' },
      { stockStatus: 'ALERT' },
    ] as Product[]);

    expect(counts).toEqual({ total: 4, low: 1, critical: 2 });
  });
});
