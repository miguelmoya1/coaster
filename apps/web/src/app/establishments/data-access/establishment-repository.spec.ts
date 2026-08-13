import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { EstablishmentRepository } from './establishment-repository';

describe('EstablishmentRepository', () => {
  let service: EstablishmentRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    service = TestBed.inject(EstablishmentRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the public routes', () => {
      expect(service.routes).toBeTruthy();
    });

    it('should have the my establishments route', () => {
      expect(service.routes.myEstablishments).toBe('/establishments');
    });

    it('should have the establishment route', () => {
      expect(service.routes.establishment(asEstablishmentId('1'))).toBe('/establishments/1');
    });

    it('should have the create route', () => {
      expect(service.routes.create).toBe('/establishments');
    });
  });

  describe('create function', () => {
    it('should be created', () => {
      expect(service.create).toBeTruthy();
    });

    it('should call create establishment endpoint', async () => {
      const res = service.create({ name: 'Test Establishment' });

      const req = httpMock.expectOne(service.routes.create);
      req.flush(null);
      expect(req.request.method).toBe('POST');

      await res;
    });

    it('should return void response', async () => {
      const res = service.create({ name: 'Test Establishment' });

      const req = httpMock.expectOne(service.routes.create);
      req.flush(null);

      expect(await res).toBeUndefined();
    });
  });
});
