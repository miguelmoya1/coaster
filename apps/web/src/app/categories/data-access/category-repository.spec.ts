import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CategoryRepository } from './category-repository';

describe('CategoryRepository', () => {
  let service: CategoryRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoryRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the public routes', () => {
      expect(service.routes).toBeTruthy();
    });

    it('should have the list route', () => {
      expect(service.routes.list(asEstablishmentId('establishment-1'))).toBe(
        '/establishments/establishment-1/categories',
      );
    });

    it('should have the create route', () => {
      expect(service.routes.create(asEstablishmentId('establishment-1'))).toBe(
        '/establishments/establishment-1/categories',
      );
    });
  });

  describe('create function', () => {
    it('should be created', () => {
      expect(service.create).toBeTruthy();
    });

    it('should call create category endpoint', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const res = service.create(establishmentId, { name: 'Test Category' });

      const req = httpMock.expectOne(service.routes.create(establishmentId));
      req.flush(null);
      expect(req.request.method).toBe('POST');

      expect(await res).toBeNull();
    });
  });

  describe('update function', () => {
    it('should be created', () => {
      expect(service.update).toBeTruthy();
    });

    it('should call update category endpoint', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const categoryId = 'cat-1';
      const res = service.update(establishmentId, categoryId, { name: 'Updated Category' });

      const req = httpMock.expectOne(`/establishments/establishment-1/categories/${categoryId}`);
      req.flush(null);
      expect(req.request.method).toBe('PATCH');

      expect(await res).toBeNull();
    });
  });
});
