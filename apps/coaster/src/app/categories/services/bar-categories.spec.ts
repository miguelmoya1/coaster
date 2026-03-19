import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { CategoryRepository } from '../data-access/category-repository';
import { BarCategories } from './bar-categories';

describe('BarCategories', () => {
  let service: BarCategories;
  let httpMock: HttpTestingController;
  const mockRoutes = { list: (id: string) => `/bars/${id}/categories` };

  beforeEach(() => {
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of categories when barId is set', () => {
    const barId = asBarId('bar-1');
    const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), barId, name: 'Test Category' }];

    service.setBarContext(barId);
    tick();

    const req = httpMock.expectOne(`/bars/${barId}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);

    expect(service.all.value()).toEqual(mockCategories);
  });

  it('should not fetch anything if barId is undefined', () => {
    tick();
    httpMock.expectNone(`/bars/undefined/categories`);
    expect(service.all.value()).toBeUndefined();
  });
  
  it('should reload data', () => {
    const barId = asBarId('bar-1');
    const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), barId, name: 'Test Category' }];

    service.setBarContext(barId);
    tick();

    const req = httpMock.expectOne(`/bars/${barId}/categories`);
    req.flush(mockCategories);

    service.reload();
    tick();

    const reloadReq = httpMock.expectOne(`/bars/${barId}/categories`);
    reloadReq.flush(mockCategories);

    expect(service.all.value()).toEqual(mockCategories);
  });
});
