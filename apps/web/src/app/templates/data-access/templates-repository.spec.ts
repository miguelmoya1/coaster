import { beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { TemplatesRepository } from './templates-repository';

describe('TemplatesRepository', () => {
  let service: TemplatesRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    service = TestBed.inject(TemplatesRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have correct paths', () => {
      expect(service.routes.categories()).toBe('/templates/categories');
      expect(service.routes.products()).toBe('/templates/products');
      expect(service.routes.import(asBarId('bar-123'))).toBe('/templates/bar/bar-123');
    });
  });

  describe('importToBar', () => {
    it('should make POST request with category template ids', async () => {
      const barId = asBarId('bar-123');
      const categoryTemplateIds = ['cat-1', 'cat-2'];

      const promise = service.importToBar(barId, categoryTemplateIds);

      const req = httpMock.expectOne(service.routes.import(barId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ categoryTemplateIds });
      req.flush({ success: true });

      await promise;
    });
  });
});
