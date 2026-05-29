import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BarsStore } from '@coaster/bars';
import { BarId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { ExchangesStore } from './exchanges.store';

describe('ExchangesStore', () => {
  let store: ExchangesStore;
  let httpMock: HttpTestingController;

  const currentBarId = signal<BarId | undefined>(undefined);

  const barsStoreMock = {
    currentId: currentBarId.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      listPending: vi.fn((barId: string) => `/bars/${barId}/exchanges`),
      request: vi.fn((barId: string, shiftId: string) => `/bars/${barId}/shifts/${shiftId}/exchanges`),
      accept: vi.fn((barId: string, exchangeId: string) => `/bars/${barId}/exchanges/${exchangeId}/accept`),
    },
  };

  // const mockExchanges: ShiftExchange[] = [
  //   {
  //     createdAt: new Date(),
  //     id: asShiftExchangeId('exchange-1'),
  //     shiftId: asShiftId('shift-1'),
  //     requesterId: asUserId('user-1'),
  //     status: ShiftExchangeStatus.PENDING,
  //     requesterName: 'John',
  //     shiftStartTime: '2026-04-17T09:00:00.000Z',
  //     shiftEndTime: '2026-04-17T17:00:00.000Z',
  //   },
  // ];

  beforeEach(() => {
    currentBarId.set(undefined);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: BarsStore, useValue: barsStoreMock },
        { provide: ExchangeRepository, useValue: repositoryMock },
      ],
    });

    store = TestBed.inject(ExchangesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('pending', () => {
    it('should be idle at start', () => {
      expect(store.exchanges.status()).toBe('idle');
    });

    // it('should fetch pending exchanges when bar context is set', async () => {
    //   const barId = asBarId('bar-1');
    //   currentBarId.set(barId);
    //   TestBed.tick();

    //   // expect(store.exchanges.isLoading()).toBe(true);

    //   httpMock.expectOne(`/bars/${barId}/exchanges`).flush(mockExchanges);
    //   await TestBed.inject(ApplicationRef).whenStable();

    //   expect(store.exchanges.hasValue()).toBe(true);
    //   expect(store.exchanges.value()).toEqual(mockExchanges);
    // });

    it('should not fetch if barId is not set', () => {
      TestBed.tick();
      httpMock.expectNone(() => true);
      expect(store.exchanges.status()).toBe('idle');
    });
  });

  // describe('reloadPending', () => {
  //   it('should reload the pending exchanges', async () => {
  //     const barId = asBarId('bar-1');
  //     currentBarId.set(barId);
  //     TestBed.tick();

  //     httpMock.expectOne(`/bars/${barId}/exchanges`).flush(mockExchanges);
  //     await TestBed.inject(ApplicationRef).whenStable();

  //     store.reload();
  //     TestBed.tick();

  //     expect(store.exchanges.isLoading()).toBe(true);

  //     httpMock.expectOne(`/bars/${barId}/exchanges`).flush([]);
  //     await TestBed.inject(ApplicationRef).whenStable();

  //     expect(store.exchanges.value()).toEqual([]);
  //   });
  // });
});
