import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, afterEach } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { asBarId, Socket } from '@coaster/core';

import { TablesStore } from './tables.store';

describe('TablesStore', () => {
  let service: TablesStore;

  let httpMock: HttpTestingController;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      tableStatusChanged: signal<any>(null),
      tableCreated: signal<any>(null),
      tableUpdated: signal<any>(null),
      tableDeleted: signal<any>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: Socket, useValue: mockSocket },
      ],
    });

    service = TestBed.inject(TablesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('list fetching & computed properties', () => {
    it('should fetch tables and compute total, freeCount, occupiedCount', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const req = httpMock.expectOne('/bars/bar-1/tables');
      expect(req.request.method).toBe('GET');
      req.flush([
        { id: 't-1', status: 'FREE', name: 'T1', number: 1, capacity: 4, barId: 'bar-1', pax: 0 },
        { id: 't-2', status: 'OCCUPIED', name: 'T2', number: 2, capacity: 4, barId: 'bar-1', pax: 2 },
        { id: 't-3', status: 'FREE', name: 'T3', number: 3, capacity: 4, barId: 'bar-1', pax: 0 }
      ]);

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(service.tables.hasValue()).toBe(true);
      expect(service.total()).toBe(3);
      expect(service.freeCount()).toBe(2);
      expect(service.occupiedCount()).toBe(1);
    });
  });

  describe('CRUD operations', () => {
    it('should create table and reload', async () => {
      service.setBarId(asBarId('bar-1'));
      
      const createPromise = service.create({ name: 'Table 1' } as any);
      const req = httpMock.expectOne('/bars/bar-1/tables');
      expect(req.request.method).toBe('POST');
      req.flush({ id: 't-new' });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const reloadReq = httpMock.expectOne('/bars/bar-1/tables');
      reloadReq.flush([]);

      const result = await createPromise;
      expect(result).toBeNull();
    });

    it('should delete table and update local list', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const getReq = httpMock.expectOne('/bars/bar-1/tables');
      getReq.flush([{ id: 't-1', status: 'FREE', name: 'T1', number: 1, capacity: 4, barId: 'bar-1', pax: 0 }]);
      
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const deletePromise = service.delete('t-1' as any);
      const req = httpMock.expectOne('/bars/bar-1/tables/t-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      await deletePromise;
      expect(service.tables.value()?.length).toBe(0);
    });

    it('should update table and modify local list', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const getReq = httpMock.expectOne('/bars/bar-1/tables');
      getReq.flush([{ id: 't-1', status: 'FREE', name: 'Old', number: 1, capacity: 4, barId: 'bar-1', pax: 0 }]);
      
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      const updatePromise = service.update('t-1' as any, { name: 'New' } as any);
      const req = httpMock.expectOne('/bars/bar-1/tables/t-1');
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });

      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      await updatePromise;
      expect(service.tables.value()?.[0].name).toBe('New');
    });

    it('should handle errors when no barId is set', async () => {
      service.setBarId(undefined);
      expect(await service.create({} as any)).not.toBeNull();
      expect(await service.update('t-1' as any, {} as any)).not.toBeNull();
      expect(await service.delete('t-1' as any)).not.toBeNull();
    });
  });

  describe('socket effects', () => {
    it('should handle tableStatusChanged', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const req1 = httpMock.expectOne('/bars/bar-1/tables');
      req1.flush([{ id: 't-1', status: 'FREE', name: 'T1', number: 1, capacity: 4, barId: 'bar-1', pax: 0 }]);
      
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.tableStatusChanged.set({ id: 't-1', status: 'OCCUPIED' });
      TestBed.tick();

      expect(service.tables.value()?.[0].status).toBe('OCCUPIED');
    });

    it('should handle tableDeleted', async () => {
      service.setBarId(asBarId('bar-1'));
      TestBed.tick();

      const req1 = httpMock.expectOne('/bars/bar-1/tables');
      req1.flush([{ id: 't-1', status: 'FREE', name: 'T1', number: 1, capacity: 4, barId: 'bar-1', pax: 0 }]);
      
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      mockSocket.tableDeleted.set({ id: 't-1' });
      TestBed.tick();

      expect(service.tables.value()?.length).toBe(0);
    });
  });
});
