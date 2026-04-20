import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, asUserId, Shift } from '@coaster/interfaces';
import { vi } from 'vitest';
import { ShiftRepository } from '../data-access/shift-repository';
import { BarShifts } from './bar-shifts';

describe('BarShifts', () => {
  let service: BarShifts;
  let httpMock: HttpTestingController;

  const mockRoutes = {
    list: (barId: string, startDate: string, endDate: string) =>
      `/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`,
  };

  let appRef: ApplicationRef;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClientTesting(),
        {
          provide: ShiftRepository,
          useValue: { routes: mockRoutes },
        },
      ],
    });
    service = TestBed.inject(BarShifts);
    httpMock = TestBed.inject(HttpTestingController);
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be in idle state initially', () => {
    expect(service.all.status()).toBe('idle');
    expect(service.all.value()).toBeUndefined();
  });

  describe('fetching shifts', () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';
    const mockShifts: Shift[] = [
      {
        id: asShiftId('shift-1'),
        barId,
        startTime: '2026-03-20T08:00:00Z',
        endTime: '2026-03-20T16:00:00Z',
        userId: asUserId('user-1'),
        userName: 'User 1',
        userImage: '',
      },
    ];

    it('should fetch shifts when context and date range are set', async () => {
      service.setContext(barId);
      service.setDateRange(startDate, endDate);

      // Trigger resource read
      service.all.value();
      TestBed.flushEffects();

      const req = httpMock.expectOne(mockRoutes.list(barId, startDate, endDate));
      expect(req.request.method).toBe('GET');
      req.flush(mockShifts);

      await appRef.whenStable();

      expect(service.all.value()).toEqual(mockShifts);
      expect(service.all.status()).toBe('resolved');
    });

    it('should not fetch if context or date range is missing', () => {
      service.setContext(barId);
      // Missing date range
      service.all.value();
      TestBed.flushEffects();
      httpMock.expectNone(() => true);
      expect(service.all.status()).toBe('idle');
    });

    it('should show loading state during fetch', async () => {
      service.setContext(barId);
      service.setDateRange(startDate, endDate);

      service.all.value();
      TestBed.flushEffects();

      expect(service.all.status()).toBe('loading');
      httpMock.expectOne(mockRoutes.list(barId, startDate, endDate)).flush([]);
      await appRef.whenStable();
    });

    it('should reload data when explicitly requested', async () => {
      service.setContext(barId);
      service.setDateRange(startDate, endDate);

      service.all.value();
      TestBed.flushEffects();

      const req1 = httpMock.expectOne(mockRoutes.list(barId, startDate, endDate));
      req1.flush(mockShifts);
      await appRef.whenStable();

      service.reload();
      TestBed.flushEffects();

      const req2 = httpMock.expectOne(mockRoutes.list(barId, startDate, endDate));
      expect(req2.request.method).toBe('GET');
      req2.flush(mockShifts);
      await appRef.whenStable();
    });
  });
});
