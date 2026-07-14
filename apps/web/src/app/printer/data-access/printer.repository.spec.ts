import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrinterRepository } from './printer.repository';

describe('PrinterRepository', () => {
  let service: PrinterRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PrinterRepository, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PrinterRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('routes', () => {
    it('should build correct connection route', () => {
      expect(service.routes.connection('bar-1')).toBe('/bars/bar-1/printer/connection');
    });

    it('should build correct status route', () => {
      expect(service.routes.status('bar-1')).toBe('/bars/bar-1/printer/status');
    });

    it('should build correct deviceKey route', () => {
      expect(service.routes.deviceKey('bar-1')).toBe('/bars/bar-1/printer/device-key');
    });

    it('should build correct print route', () => {
      expect(service.routes.print('192.168.1.100', 8080)).toBe(
        'http://192.168.1.100:8080/print',
      );
    });
  });

  describe('getConnection', () => {
    it('should fetch connection details', async () => {
      const expected = { ipAddress: '192.168.1.100', port: 8080, token: 'jwt-token' };
      const promise = service.getConnection('bar-1');

      const req = httpMock.expectOne('/bars/bar-1/printer/connection');
      expect(req.request.method).toBe('GET');
      req.flush(expected);

      const result = await promise;
      expect(result).toEqual(expected);
    });
  });

  describe('getStatus', () => {
    it('should fetch printer status', async () => {
      const expected = {
        barId: 'bar-1',
        isOnline: true,
        ipAddress: '192.168.1.100',
        port: 8080,
        lastSeenAt: '2026-07-13T20:00:00.000Z',
      };
      const promise = service.getStatus('bar-1');

      const req = httpMock.expectOne('/bars/bar-1/printer/status');
      expect(req.request.method).toBe('GET');
      req.flush(expected);

      const result = await promise;
      expect(result).toEqual(expected);
    });
  });

  describe('generateDeviceKey', () => {
    it('should POST to generate device key', async () => {
      const expected = { deviceKey: 'uuid-key-123' };
      const promise = service.generateDeviceKey('bar-1');

      const req = httpMock.expectOne('/bars/bar-1/printer/device-key');
      expect(req.request.method).toBe('POST');
      req.flush(expected);

      const result = await promise;
      expect(result.deviceKey).toBe('uuid-key-123');
    });
  });

  describe('sendPrintRequest', () => {
    it('should POST structured payload to printer bridge', async () => {
      const payload = {
        type: 'order' as const,
        table: 'Mesa 1',
        items: [{ name: 'Beer', quantity: 2, price: '3.50', total: '7.00' }],
        total: '7.00',
        currency: 'EUR',
      };

      const promise = service.sendPrintRequest('192.168.1.100', 8080, 'jwt-token', payload);

      const req = httpMock.expectOne('http://192.168.1.100:8080/print');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.body).toEqual(payload);
      req.flush(null);

      await promise;
    });
  });
});
