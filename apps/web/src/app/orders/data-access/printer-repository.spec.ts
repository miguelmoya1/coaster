import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrinterRepository } from './printer-repository';

describe('PrinterRepository', () => {
  let service: PrinterRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(PrinterRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have connection helper', () => {
      expect(service.routes.connection('bar-1')).toBe('/bars/bar-1/printer/connection');
    });

    it('should have local print helper', () => {
      expect(service.routes.print('192.168.1.100')).toBe('http://192.168.1.100:8080/print');
    });
  });

  describe('getConnection', () => {
    it('should fetch connection details', async () => {
      const responsePromise = service.getConnection('bar-1');

      const req = httpMock.expectOne('/bars/bar-1/printer/connection');
      expect(req.request.method).toBe('GET');
      req.flush({ ipAddress: '192.168.1.50', token: 'mock-token-abc' });

      const result = await responsePromise;
      expect(result).toEqual({ ipAddress: '192.168.1.50', token: 'mock-token-abc' });
    });
  });

  describe('sendPrintRequest', () => {
    it('should POST text to the local print endpoint with authorization token', async () => {
      const responsePromise = service.sendPrintRequest('192.168.1.50', 'mock-token-abc', 'Hello World');

      const req = httpMock.expectOne('http://192.168.1.50:8080/print');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-abc');
      expect(req.request.body).toBe('Hello World');
      expect(req.request.responseType).toBe('text');
      req.flush('OK');

      await responsePromise;
    });
  });

  describe('printText', () => {
    it('should fetch connection details and send print request', async () => {
      const responsePromise = service.printText('bar-1', 'Order details content');

      // 1. Connection detail GET request
      const connReq = httpMock.expectOne('/bars/bar-1/printer/connection');
      expect(connReq.request.method).toBe('GET');
      connReq.flush({ ipAddress: '192.168.1.50', token: 'mock-token-abc' });

      // Let macrotasks/microtasks run so that the connection response is processed and the print request is fired
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 2. Local print bridge POST request
      const printReq = httpMock.expectOne('http://192.168.1.50:8080/print');
      expect(printReq.request.method).toBe('POST');
      expect(printReq.request.headers.get('Authorization')).toBe('Bearer mock-token-abc');
      expect(printReq.request.body).toBe('Order details content');
      printReq.flush('Printed successfully');

      await responsePromise;
    });

    it('should handle error if connection endpoint fails', async () => {
      const responsePromise = service.printText('bar-1', 'Order details content');

      const connReq = httpMock.expectOne('/bars/bar-1/printer/connection');
      expect(connReq.request.method).toBe('GET');
      connReq.flush('Failed to fetch connection info', { status: 500, statusText: 'Internal Server Error' });

      await expect(responsePromise).rejects.toThrow();
    });
  });
});
