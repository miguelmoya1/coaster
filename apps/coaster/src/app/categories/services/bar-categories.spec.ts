import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
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
        provideZonelessChangeDetection(),
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

  it('should fetch list of categories when barId is set', async () => {
    const barId = asBarId('bar-1');
    const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), barId, name: 'Test Category' }];

    service.setBarContext(barId);
    service.all.value();
    TestBed.flushEffects();
    const req = httpMock.expectOne(`/bars/${barId}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
    
    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.all.value)));
    expect(service.all.value()).toEqual(mockCategories);
  });

  it('should not fetch anything if barId is undefined', () => {
    TestBed.tick();
    httpMock.expectNone(`/bars/undefined/categories`);
  });
});
