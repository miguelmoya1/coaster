import { asEstablishmentId, asShiftExchangeId, asShiftId, asUserId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CreateShiftExchangeDto } from '@coaster/common';
import { ExchangeRepository } from './exchange-repository';

describe('ExchangeRepository', () => {
  let service: ExchangeRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(ExchangeRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the listPending route', () => {
      expect(service.routes.listPending(asEstablishmentId('1'))).toBe('/establishments/1/exchanges');
    });

    it('should have the request route', () => {
      expect(service.routes.request(asEstablishmentId('1'), asShiftId('2'))).toBe(
        '/establishments/1/shifts/2/exchanges',
      );
    });

    it('should have the accept route', () => {
      expect(service.routes.accept(asEstablishmentId('1'), asShiftExchangeId('3'))).toBe(
        '/establishments/1/exchanges/3/accept',
      );
    });
  });

  describe('request', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const shiftId = asShiftId('shift-1');
    const dto: CreateShiftExchangeDto = { targetId: asUserId('user-2') };

    it('should call request exchange endpoint', async () => {
      const promise = service.request(establishmentId, shiftId, dto);

      const req = httpMock.expectOne(service.routes.request(establishmentId, shiftId));
      expect(req.request.method).toBe('POST');
      req.flush(null);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('accept', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const exchangeId = asShiftExchangeId('exchange-1');

    it('should call accept exchange endpoint', async () => {
      const promise = service.accept(establishmentId, exchangeId);

      const req = httpMock.expectOne(service.routes.accept(establishmentId, exchangeId));
      expect(req.request.method).toBe('PATCH');
      req.flush(null);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
