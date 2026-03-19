import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product, ProductStatus } from '@coaster/interfaces';
import { ProductRepository } from '../data-access/product-repository';
import { BarProducts } from './bar-products';

describe('BarProducts', () => {
  let service: BarProducts;
  let httpMock: HttpTestingController;
  const mockRoutes = { list: (id: string) => `/bars/${id}/products` };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ProductRepository,
          useValue: { routes: mockRoutes },
        },
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

  it('should fetch list of products when barId is set', () => {
    const barId = asBarId('bar-1');
    const mockProducts: Product[] = [
      { id: asProductId('prod-1'), categoryId: asCategoryId('cat-1'), name: 'Test Product', status: ProductStatus.OK, lastUpdated: new Date().toISOString() },
    ];

    service.setBarContext(barId);
    tick();

    const req = httpMock.expectOne(`/bars/${barId}/products`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);

    expect(service.all.value()).toEqual(mockProducts);
  });

  it('should not fetch anything if barId is undefined', () => {
    tick();
    httpMock.expectNone(`/bars/undefined/products`);
    expect(service.all.value()).toBeUndefined();
  });
  
  it('should reload data', () => {
    const barId = asBarId('bar-1');
    const mockProducts: Product[] = [
      { id: asProductId('prod-1'), categoryId: asCategoryId('cat-1'), name: 'Test Product', status: ProductStatus.OK, lastUpdated: new Date().toISOString() },
    ];

    service.setBarContext(barId);
    tick();

    const req = httpMock.expectOne(`/bars/${barId}/products`);
    req.flush(mockProducts);

    service.reload();
    tick();

    const reloadReq = httpMock.expectOne(`/bars/${barId}/products`);
    reloadReq.flush(mockProducts);

    expect(service.all.value()).toEqual(mockProducts);
  });
});
