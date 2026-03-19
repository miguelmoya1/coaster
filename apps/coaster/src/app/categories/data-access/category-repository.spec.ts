import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { CategoryRepository } from './category-repository';

describe('CategoryRepository', () => {
  let service: CategoryRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call create category endpoint', async () => {
    const barId = asBarId('bar-1');
    const mockCategory: Category = { id: asCategoryId('1'), barId, name: 'Test Category' };
    const promise = service.create(barId, { name: 'Test Category' });

    const req = httpMock.expectOne(service.routes.create(barId));
    expect(req.request.method).toBe('POST');
    req.flush(mockCategory);

    const result = await promise;
    expect(result).toEqual(mockCategory);
  });
});
