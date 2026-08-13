import { asEstablishmentId, asUserId } from '@coaster/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CreateShiftDto } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftRepository } from './shift-repository';

describe('ShiftRepository', () => {
  let repository: ShiftRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ShiftRepository],
    });
    repository = TestBed.inject(ShiftRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  describe('routes', () => {
    it('should generate correct list route', () => {
      expect(repository.routes.list(asEstablishmentId('establishment-1'), '2026-01-01', '2026-01-31')).toBe(
        '/establishments/establishment-1/shifts?startDate=2026-01-01&endDate=2026-01-31',
      );
    });

    it('should generate correct create route', () => {
      expect(repository.routes.create(asEstablishmentId('establishment-1'))).toBe(
        '/establishments/establishment-1/shifts',
      );
    });
  });

  describe('create', () => {
    it('should call the create endpoint and resolve to void', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const dto: CreateShiftDto = {
        startTime: '2026-03-20T08:00:00Z',
        endTime: '2026-03-20T16:00:00Z',
        userId: asUserId('user-1'),
      };

      const promise = repository.create(establishmentId, dto);

      const req = httpMock.expectOne(repository.routes.create(establishmentId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(null);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should call the delete endpoint and resolve to void', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const shiftId = 'shift-1';

      const promise = repository.delete(establishmentId, shiftId);

      const req = httpMock.expectOne(repository.routes.delete(establishmentId, shiftId));
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
