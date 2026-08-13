import { asEstablishmentId, asTableId } from '@coaster/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TableRepository } from './table-repository';

describe('TableRepository', () => {
  let service: TableRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(TableRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the list route', () => {
      expect(service.routes.list(asEstablishmentId('1'))).toBe('/establishments/1/tables');
    });

    it('should have the create route', () => {
      expect(service.routes.create(asEstablishmentId('1'))).toBe('/establishments/1/tables');
    });

    it('should have the update route', () => {
      expect(service.routes.update(asEstablishmentId('1'), asTableId('2'))).toBe('/establishments/1/tables/2');
    });

    it('should have the delete route', () => {
      expect(service.routes.delete(asEstablishmentId('1'), asTableId('2'))).toBe('/establishments/1/tables/2');
    });
  });

  describe('create', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const dto = { name: 'Mesa 1' };

    it('should call create endpoint', async () => {
      const promise = service.create(establishmentId, dto);
      const req = httpMock.expectOne(service.routes.create(establishmentId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });

    it('should return void', async () => {
      const res = service.create(establishmentId, dto);
      httpMock.expectOne(service.routes.create(establishmentId)).flush(null);
      expect(await res).toBeNull();
    });
  });

  describe('update', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const tableId = asTableId('table-1');
    const dto = { name: 'Mesa Actualizada' };

    it('should call update endpoint', async () => {
      const promise = service.update(establishmentId, tableId, dto);
      const req = httpMock.expectOne(service.routes.update(establishmentId, tableId));
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });
      await promise;
    });

    it('should return success response', async () => {
      const res = service.update(establishmentId, tableId, dto);
      httpMock.expectOne(service.routes.update(establishmentId, tableId)).flush({ success: true });
      expect(await res).toEqual({ success: true });
    });
  });

  describe('delete', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const tableId = asTableId('table-1');

    it('should call delete endpoint', async () => {
      const promise = service.delete(establishmentId, tableId);
      const req = httpMock.expectOne(service.routes.delete(establishmentId, tableId));
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });

    it('should return delete response', async () => {
      const res = service.delete(establishmentId, tableId);
      httpMock.expectOne(service.routes.delete(establishmentId, tableId)).flush({ success: true });
      expect(await res).toEqual({ success: true });
    });
  });
});
