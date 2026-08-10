import { asEstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
      expect(service.routes.import(asEstablishmentId('establishment-123'))).toBe(
        '/templates/establishment/establishment-123',
      );
    });
  });

  describe('importToEstablishment', () => {
    it('should make POST request with category template ids', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      const categoryTemplateIds = ['cat-1', 'cat-2'];

      const promise = service.importToEstablishment(establishmentId, categoryTemplateIds);

      const req = httpMock.expectOne(service.routes.import(establishmentId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ categoryTemplateIds });
      req.flush(null);

      await promise;
    });
  });
});
