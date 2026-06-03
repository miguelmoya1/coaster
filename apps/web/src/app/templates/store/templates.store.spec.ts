import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { TemplatesStore } from './templates.store';

describe('TemplatesStore', () => {
  let store: TemplatesStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    store = TestBed.inject(TemplatesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should load categories and products flat resources', async () => {
    store.categories.value();
    store.products.value();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const catsReq = httpMock.expectOne('/templates/categories');
    const prodsReq = httpMock.expectOne('/templates/products');

    expect(catsReq.request.method).toBe('GET');
    expect(prodsReq.request.method).toBe('GET');

    catsReq.flush([{ id: 'cat-1', name: 'Licores' }]);
    prodsReq.flush([{ id: 'prod-1', name: 'Vodka', price: 1500, categoryId: 'cat-1' }]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.categories.value()).toEqual([{ id: 'cat-1', name: 'Licores' }]);
    expect(store.products.value()).toEqual([{ id: 'prod-1', name: 'Vodka', price: 1500, categoryId: 'cat-1' }]);
  });

  it('should trigger importToBar repository method successfully', async () => {
    store.categories.value();
    store.products.value();

    await new Promise((resolve) => setTimeout(resolve, 0));

    httpMock.expectOne('/templates/categories').flush([]);
    httpMock.expectOne('/templates/products').flush([]);

    const barId = asBarId('bar-123');
    const promise = store.importToBar(barId, ['cat-1']);

    const req = httpMock.expectOne('/templates/bar/bar-123');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, created: 3, modified: 0 });

    const result = await promise;
    expect(result).toEqual({ counts: { success: true, created: 3, modified: 0 }, err: null });
  });
});
