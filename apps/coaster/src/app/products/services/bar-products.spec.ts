import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product } from '@coaster/interfaces';
import { ProductRepository } from '../data-access/product-repository';
import { BarProducts } from './bar-products';

describe('BarProducts', () => {
  let service: BarProducts;
  let httpMock: HttpTestingController;
  const mockRoutes = { list: (id: string) => `/bars/${id}/products` };

  beforeEach(async () => {
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

  it('should be created', async () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of products when barId is set', async () => {
    const barId = asBarId('bar-1');
    const mockProducts: Product[] = [
      {
        id: asProductId('prod-1'),
        categoryId: asCategoryId('cat-1'),
        name: 'Test Product',
        currentStock: 10,
        minStockAlert: 5,
        lastUpdated: new Date().toISOString(),
      },
    ];

    service.setBarContext(barId);
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne(`/bars/${barId}/products`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
  });

  it('should not fetch anything if barId is undefined', async () => {
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    httpMock.expectNone(`/bars/undefined/products`);
    service.all.value();
  });
});
