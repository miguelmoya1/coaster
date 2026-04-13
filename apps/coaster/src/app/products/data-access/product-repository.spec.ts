import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product } from '@coaster/interfaces';
import { ProductRepository } from './product-repository';

describe('ProductRepository', () => {
  let service: ProductRepository;
  let httpMock: HttpTestingController;

  const mockProduct: Product = {
    id: asProductId('1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Test Product',
    currentStock: 10,
    minStockAlert: 5,
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('should call create product endpoint', async () => {
    const barId = asBarId('bar-1');
    const promise = service.create(barId, { name: 'Test Product', categoryId: asCategoryId('cat-1') });

    const req = httpMock.expectOne(service.routes.create(barId));
    expect(req.request.method).toBe('POST');
    req.flush(mockProduct);

    const result = await promise;
    expect(result).toEqual(mockProduct);
  });

  it('should call update stock endpoint', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('1');
    const promise = service.updateStock(barId, productId, { currentStock: 2 });

    const req = httpMock.expectOne(service.routes.updateStock(barId, productId));
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockProduct, currentStock: 2, minStockAlert: 5 });

    const result = await promise;
    expect(result).toEqual({ ...mockProduct, currentStock: 2, minStockAlert: 5 });
  });
});
