import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { categoryMapper } from '../mappers/category.mapper';
import { CategoryRepository } from './category-repository';

vi.mock('../mappers/category.mapper', () => ({
  categoryMapper: vi.fn((category: Category) => category),
}));

describe('CategoryRepository', () => {
  let service: CategoryRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoryRepository);
    httpMock = TestBed.inject(HttpTestingController);

    vi.mocked(categoryMapper).mockClear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the public routes', () => {
      expect(service.routes).toBeTruthy();
    });

    it('should have the list route', () => {
      expect(service.routes.list(asBarId('bar-1'))).toBe('/bars/bar-1/categories');
    });

    it('should have the create route', () => {
      expect(service.routes.create(asBarId('bar-1'))).toBe('/bars/bar-1/categories');
    });
  });

  describe('create function', () => {
    it('should be created', () => {
      expect(service.create).toBeTruthy();
    });

    it('should call create category endpoint', async () => {
      const barId = asBarId('bar-1');
      const res = service.create(barId, { name: 'Test Category' });

      const req = httpMock.expectOne(service.routes.create(barId));
      req.flush({ id: asCategoryId('1'), barId, name: 'Test Category' });
      expect(req.request.method).toBe('POST');

      await res;
    });

    it('should return the created category', async () => {
      const barId = asBarId('bar-1');
      const category: Category = { id: asCategoryId('1'), barId, name: 'Test Category' };
      const res = service.create(barId, { name: 'Test Category' });

      const req = httpMock.expectOne(service.routes.create(barId));
      req.flush(category);

      expect(await res).toEqual(category);
    });

    describe('mapper', () => {
      it('should map the response to a category', async () => {
        const barId = asBarId('bar-1');
        const category: Category = { id: asCategoryId('1'), barId, name: 'Test Category' };
        const res = service.create(barId, { name: 'Test Category' });

        const req = httpMock.expectOne(service.routes.create(barId));
        req.flush(category);

        expect(await res).toEqual(category);
        expect(categoryMapper).toHaveBeenCalledTimes(1);
        expect(categoryMapper).toHaveBeenCalledWith(category);
      });
    });
  });

  describe('update function', () => {
    it('should be created', () => {
      expect(service.update).toBeTruthy();
    });

    it('should call update category endpoint', async () => {
      const barId = asBarId('bar-1');
      const categoryId = 'cat-1';
      const res = service.update(barId, categoryId, { name: 'Updated Category' });

      const req = httpMock.expectOne(`/bars/bar-1/categories/${categoryId}`);
      req.flush({ id: asCategoryId(categoryId), barId, name: 'Updated Category' });
      expect(req.request.method).toBe('PATCH');

      await res;
    });

    it('should return the updated category', async () => {
      const barId = asBarId('bar-1');
      const categoryId = 'cat-1';
      const category: Category = { id: asCategoryId(categoryId), barId, name: 'Updated Category' };
      const res = service.update(barId, categoryId, { name: 'Updated Category' });

      const req = httpMock.expectOne(`/bars/bar-1/categories/${categoryId}`);
      req.flush(category);

      expect(await res).toEqual(category);
    });

    describe('mapper', () => {
      it('should map the response to a category', async () => {
        const barId = asBarId('bar-1');
        const categoryId = 'cat-1';
        const category: Category = { id: asCategoryId(categoryId), barId, name: 'Updated Category' };
        const res = service.update(barId, categoryId, { name: 'Updated Category' });

        const req = httpMock.expectOne(`/bars/bar-1/categories/${categoryId}`);
        req.flush(category);

        expect(await res).toEqual(category);
        expect(categoryMapper).toHaveBeenCalledTimes(1);
        expect(categoryMapper).toHaveBeenCalledWith(category);
      });
    });
  });
});
