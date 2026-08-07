import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  afterEach(() => httpMock.verify());

  describe('routes', () => {
    it('should build the job routes on the API', () => {
      expect(service.routes.print('bar-1')).toBe('/bars/bar-1/printer/jobs');
      expect(service.routes.job('bar-1', 'job-1')).toBe('/bars/bar-1/printer/jobs/job-1');
      expect(service.routes.status('bar-1')).toBe('/bars/bar-1/printer/status');
      expect(service.routes.deviceKey('bar-1')).toBe('/bars/bar-1/printer/device-key');
    });

    it('should never address the bridge directly', () => {
      const routes = Object.values(service.routes).map((build) => build('bar-1', 'job-1'));

      for (const route of routes) {
        expect(route.startsWith('/')).toBe(true);
        expect(route).not.toContain('http://');
      }
    });
  });

  describe('printTicket', () => {
    it('should queue the ticket and return its job id', async () => {
      const payload = {
        type: 'order' as const,
        table: 'Mesa 1',
        items: [{ name: 'Beer', quantity: 2, price: '3.50', total: '7.00' }],
        total: '7.00',
        currency: 'EUR',
      };

      const promise = service.printTicket('bar-1', payload);

      const req = httpMock.expectOne('/bars/bar-1/printer/jobs');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ jobId: 'job-1' });

      expect(await promise).toEqual({ jobId: 'job-1' });
    });
  });

  describe('getJob', () => {
    it('should fetch the job status', async () => {
      const expected = {
        id: 'job-1',
        status: 'PRINTED' as const,
        error: null,
        createdAt: '2026-08-07T10:00:00.000Z',
        completedAt: '2026-08-07T10:00:02.000Z',
      };

      const promise = service.getJob('bar-1', 'job-1');

      const req = httpMock.expectOne('/bars/bar-1/printer/jobs/job-1');
      expect(req.request.method).toBe('GET');
      req.flush(expected);

      expect(await promise).toEqual(expected);
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

      expect(await promise).toEqual(expected);
    });
  });

  describe('generateDeviceKey', () => {
    it('should POST to generate device key', async () => {
      const promise = service.generateDeviceKey('bar-1');

      const req = httpMock.expectOne('/bars/bar-1/printer/device-key');
      expect(req.request.method).toBe('POST');
      req.flush({ deviceKey: 'uuid-key-123' });

      expect((await promise).deviceKey).toBe('uuid-key-123');
    });
  });
});
