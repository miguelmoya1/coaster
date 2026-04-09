import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { CategoryRepository } from '../data-access/category-repository';
import { BarCategories } from './bar-categories';

describe('BarCategories', () => {
  let service: BarCategories;
  let httpMock: HttpTestingController;
  const mockRoutes = { list: (id: string) => `/bars/${id}/categories` };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CategoryRepository,
          useValue: { routes: mockRoutes },
        },
      ],
    });
    service = TestBed.inject(BarCategories);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', async () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of categories when barId is set', async () => {
    const barId = asBarId('bar-1');
    const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), barId, name: 'Test Category' }];

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
    const req = httpMock.expectOne(`/bars/${barId}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
  });

  it('should not fetch anything if barId is undefined', async () => {
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    httpMock.expectNone(`/bars/undefined/categories`);
    service.all.value();
  });
});
