import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, afterEach } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { asBarId, Socket } from '@coaster/core';

import { ShiftsStore } from './shifts.store';

describe('ShiftsStore', () => {
  let service: ShiftsStore;

  let httpMock: HttpTestingController;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      shiftCreated: signal<any>(null),
      shiftDeleted: signal<any>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: Socket, useValue: mockSocket },
      ],
    });

    service = TestBed.inject(ShiftsStore);
    httpMock = TestBed.inject(HttpTestingController);

    // Set dates so httpResource triggers properly
    service.setDateRange('2026-07-01', '2026-07-07');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('list fetching', () => {
    it('should fetch shifts when barId and dates are set', async () => {
      service.setBarId(asBarId('bar-1'));
      service.setDateRange('2026-07-01', '2026-07-07');
      TestBed.tick();

      const req = httpMock.expectOne('/bars/bar-1/shifts?startDate=2026-07-01&endDate=2026-07-07');
      expect(req.request.method).toBe('GET');
      req.flush([{ id: 's-1', startTime: '2026-07-01T10:00:00Z', endTime: '2026-07-01T18:00:00Z', userName: 'Test' }]);

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(service.shifts.hasValue()).toBe(true);
      expect(service.shifts.value()?.length).toBe(1);
    });
  });

  describe('create', () => {
    it('should create shift and reload', async () => {
      service.setBarId(asBarId('bar-1'));
      
      const createPromise = service.create({} as any);
      const req = httpMock.expectOne(req => req.url.includes('/bars/bar-1/shifts'));
      expect(req.request.method).toBe('POST');
      req.flush({ id: 's-new' });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const reloadReq = httpMock.expectOne(req => req.url.includes('/bars/bar-1/shifts'));
      reloadReq.flush([]);

      const result = await createPromise;
      expect(result).toBeUndefined();
    });

    it('should return error if no barId', async () => {
      service.setBarId(undefined);
      await expect(service.create({} as any)).rejects.toThrow('MISSING_BAR_ID');
    });
  });

  describe('delete', () => {
    it('should delete shift and reload', async () => {
      service.setBarId(asBarId('bar-1'));
      
      const deletePromise = service.delete('s-1');
      const req = httpMock.expectOne('/bars/bar-1/shifts/s-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const reloadReq = httpMock.expectOne(req => req.url.includes('/bars/bar-1/shifts'));
      reloadReq.flush([]);

      const result = await deletePromise;
      expect(result).toBeUndefined();
    });

    it('should return error if no barId', async () => {
      service.setBarId(undefined);
      await expect(service.delete('s-1')).rejects.toThrow('MISSING_BAR_ID');
    });
  });

  describe('socket effects', () => {
    it('should reload on shiftCreated', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const req1 = httpMock.expectOne(req => req.url.includes('/bars/bar-1/shifts'));
      req1.flush([]);
      
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.shiftCreated.set({ id: 's-1' });
      TestBed.tick();

      const req2 = httpMock.expectOne(req => req.url.includes('/bars/bar-1/shifts'));
      req2.flush([{ id: 's-1' }]);
    });

    it('should update local list on shiftDeleted', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const req1 = httpMock.expectOne(req => req.url.includes('/bars/bar-1/shifts'));
      req1.flush([{ id: 's-1', startTime: '2026-07-01T10:00:00Z', endTime: '2026-07-01T18:00:00Z', userName: 'Test' }]);
      
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.shiftDeleted.set({ id: 's-1' });
      TestBed.tick();

      expect(service.shifts.value()?.length).toBe(0);
    });
  });
});
