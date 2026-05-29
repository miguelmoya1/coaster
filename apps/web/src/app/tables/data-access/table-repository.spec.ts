import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asTableId } from '@coaster/common';
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
      expect(service.routes.list(asBarId('1'))).toBe('/bars/1/tables');
    });

    it('should have the create route', () => {
      expect(service.routes.create(asBarId('1'))).toBe('/bars/1/tables');
    });

    it('should have the update route', () => {
      expect(service.routes.update(asBarId('1'), asTableId('2'))).toBe('/bars/1/tables/2');
    });

    it('should have the delete route', () => {
      expect(service.routes.delete(asBarId('1'), asTableId('2'))).toBe('/bars/1/tables/2');
    });
  });

  describe('create', () => {
    const barId = asBarId('bar-1');
    const dto = { name: 'Mesa 1' };

    it('should call create endpoint', async () => {
      const promise = service.create(barId, dto);
      const req = httpMock.expectOne(service.routes.create(barId));
      expect(req.request.method).toBe('POST');
      req.flush({ id: asTableId('table-1') });
      await promise;
    });

    it('should return table creation id response', async () => {
      const res = service.create(barId, dto);
      httpMock.expectOne(service.routes.create(barId)).flush({ id: asTableId('table-1') });
      expect(await res).toEqual({ id: asTableId('table-1') });
    });
  });

  describe('update', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');
    const dto = { name: 'Mesa Actualizada' };

    it('should call update endpoint', async () => {
      const promise = service.update(barId, tableId, dto);
      const req = httpMock.expectOne(service.routes.update(barId, tableId));
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });
      await promise;
    });

    it('should return success response', async () => {
      const res = service.update(barId, tableId, dto);
      httpMock.expectOne(service.routes.update(barId, tableId)).flush({ success: true });
      expect(await res).toEqual({ success: true });
    });
  });

  describe('delete', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');

    it('should call delete endpoint', async () => {
      const promise = service.delete(barId, tableId);
      const req = httpMock.expectOne(service.routes.delete(barId, tableId));
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });

    it('should return delete response', async () => {
      const res = service.delete(barId, tableId);
      httpMock.expectOne(service.routes.delete(barId, tableId)).flush({ success: true });
      expect(await res).toEqual({ success: true });
    });
  });
});
