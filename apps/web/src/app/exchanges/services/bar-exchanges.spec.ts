import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asShiftExchangeId,
  asShiftId,
  asUserId,
  BarId,
  ShiftExchange,
  ShiftExchangeStatus,
} from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CurrentBar } from '../../bars';
import { BarExchanges } from './bar-exchanges';

describe('BarExchanges', () => {
  let service: BarExchanges;
  let httpMock: HttpTestingController;

  const currentId = signal<BarId | undefined>(undefined);

  const currentBarMock = {
    currentId: currentId.asReadonly(),
    setBarContext: (barId: BarId | undefined) => currentId.set(barId),
  };

  const mockExchanges: ShiftExchange[] = [
    {
      createdAt: new Date(),
      id: asShiftExchangeId('exchange-1'),
      shiftId: asShiftId('shift-1'),
      requesterId: asUserId('user-1'),
      status: ShiftExchangeStatus.PENDING,
      requesterName: 'John',
      shiftStartTime: '2026-04-17T09:00:00.000Z',
      shiftEndTime: '2026-04-17T17:00:00.000Z',
    },
  ];

  beforeEach(() => {
    currentId.set(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        {
          provide: CurrentBar,
          useValue: currentBarMock,
        },
      ],
    });
    service = TestBed.inject(BarExchanges);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('pending', () => {
    it('should be idle at start', () => {
      expect(service.pending.status()).toBe('idle');
    });

    it('should fetch pending exchanges when bar context is set', async () => {
      const barId = asBarId('bar-1');
      currentBarMock.setBarContext(barId);

      TestBed.tick();
      expect(service.pending.isLoading()).toBe(true);

      httpMock.expectOne(`/bars/${barId}/exchanges`).flush(mockExchanges);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.pending.hasValue()).toBe(true);
      expect(service.pending.value()).toEqual(mockExchanges);
    });

    it('should not fetch if barId is not set', () => {
      TestBed.tick();
      httpMock.expectNone(() => true);
      expect(service.pending.status()).toBe('idle');
    });
  });

  describe('reload', () => {
    it('should reload the pending exchanges', async () => {
      const barId = asBarId('bar-1');
      currentBarMock.setBarContext(barId);
      TestBed.tick();
      httpMock.expectOne(`/bars/${barId}/exchanges`).flush(mockExchanges);
      await TestBed.inject(ApplicationRef).whenStable();

      service.reload();
      TestBed.tick();
      expect(service.pending.isLoading()).toBe(true);

      httpMock.expectOne(`/bars/${barId}/exchanges`).flush([]);
      await TestBed.inject(ApplicationRef).whenStable();
      expect(service.pending.value()).toEqual([]);
    });
  });
});
