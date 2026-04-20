import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asCategoryId,
  asProductId,
  CreateProductDto,
  Product,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/interfaces';
import { ProductRepository } from './product-repository';

describe('ProductRepository', () => {
  let service: ProductRepository;
  let httpMock: HttpTestingController;

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    currentStock: 10,
    minStockAlert: 5,
    lastUpdated: new Date().toISOString(),
  };

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
      req.flush(mockProduct);

      await promise;
    });

    it('should return mapped product', async () => {
      const res = service.create(barId, dto);
      httpMock.expectOne(service.routes.create(barId)).flush(mockProduct);

      expect(await res).toEqual(mockProduct);
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
      req.flush(mockProduct);

      await promise;
    });

    it('should return mapped product', async () => {
      const res = service.update(barId, productId, dto);
      httpMock.expectOne(service.routes.update(barId, productId)).flush(mockProduct);

      expect(await res).toEqual(mockProduct);
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
      req.flush(mockProduct);

      await promise;
    });

    it('should return mapped product', async () => {
      const res = service.updateStock(barId, productId, dto);
      httpMock.expectOne(service.routes.updateStock(barId, productId)).flush(mockProduct);

      expect(await res).toEqual(mockProduct);
    });
  });
});
