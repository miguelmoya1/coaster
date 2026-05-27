import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asCategoryId,
  asProductId,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductRepository } from './product-repository';

describe('ProductRepository', () => {
  let service: ProductRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the list route', () => {
      expect(service.routes.list(asBarId('1'))).toBe('/bars/1/products');
    });

    it('should have the create route', () => {
      expect(service.routes.create(asBarId('1'))).toBe('/bars/1/products');
    });

    it('should have the update route', () => {
      expect(service.routes.update(asBarId('1'), asProductId('2'))).toBe('/bars/1/products/2');
    });

    it('should have the updateStock route', () => {
      expect(service.routes.updateStock(asBarId('1'), asProductId('2'))).toBe('/bars/1/products/2/stock');
    });
  });

  describe('create', () => {
    const barId = asBarId('bar-1');
    const dto: CreateProductDto = { name: 'New Beer', categoryId: asCategoryId('cat-1'), minStockAlert: 5 };

    it('should call create product endpoint', async () => {
      const promise = service.create(barId, dto);

      const req = httpMock.expectOne(service.routes.create(barId));
      expect(req.request.method).toBe('POST');
      req.flush({ id: asProductId('prod-1') });

      await promise;
    });

    it('should return product creation id response', async () => {
      const res = service.create(barId, dto);
      httpMock.expectOne(service.routes.create(barId)).flush({ id: asProductId('prod-1') });

      expect(await res).toEqual({ id: asProductId('prod-1') });
    });
  });

  describe('update', () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto: UpdateProductDto = { name: 'Updated Beer' };

    it('should call update product endpoint', async () => {
      const promise = service.update(barId, productId, dto);

      const req = httpMock.expectOne(service.routes.update(barId, productId));
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });

      await promise;
    });

    it('should return success response', async () => {
      const res = service.update(barId, productId, dto);
      httpMock.expectOne(service.routes.update(barId, productId)).flush({ success: true });

      expect(await res).toEqual({ success: true });
    });
  });

  describe('updateStock', () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto: UpdateProductStockDto = { currentStock: 15 };

    it('should call updateStock product endpoint', async () => {
      const promise = service.updateStock(barId, productId, dto);

      const req = httpMock.expectOne(service.routes.updateStock(barId, productId));
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });

      await promise;
    });

    it('should return success response', async () => {
      const res = service.updateStock(barId, productId, dto);
      httpMock.expectOne(service.routes.updateStock(barId, productId)).flush({ success: true });

      expect(await res).toEqual({ success: true });
    });
  });
});
