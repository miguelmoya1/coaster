import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product, ProductStatus } from '@coaster/interfaces';
import { ProductRepository } from './product-repository';

describe('ProductRepository', () => {
  let service: ProductRepository;
  let httpMock: HttpTestingController;

  const mockProduct: Product = {
    id: asProductId('1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Test Product',
    status: ProductStatus.OK,
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

  it('should call update status endpoint', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('1');
    const promise = service.updateStatus(barId, productId, { status: ProductStatus.OUT_OF_STOCK });

    const req = httpMock.expectOne(service.routes.updateStatus(barId, productId));
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockProduct, status: ProductStatus.OUT_OF_STOCK });

    const result = await promise;
    expect(result).toEqual({ ...mockProduct, status: ProductStatus.OUT_OF_STOCK });
  });
});
