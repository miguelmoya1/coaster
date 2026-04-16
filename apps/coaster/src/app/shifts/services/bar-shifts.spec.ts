import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { asBarId, asShiftId, asUserId, Shift } from '@coaster/interfaces';
import { ShiftRepository } from '../data-access/shift-repository';
import { BarShifts } from './bar-shifts';

describe('BarShifts', () => {
  let service: BarShifts;
  let httpMock: HttpTestingController;

  const mockRoutes = {
    list: (barId: string, startDate: string, endDate: string) =>
      `/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ShiftRepository,
          useValue: { routes: mockRoutes },
        },
      ],
    });
    service = TestBed.inject(BarShifts);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of shifts when barId, startDate, and endDate are set', async () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';

    const mockShifts: Shift[] = [
      { id: asShiftId('shift-1'), barId, startTime: '2026-03-20T08:00:00Z', endTime: '2026-03-20T16:00:00Z', userId: asUserId('user-1') },
    ];

    service.setContext(barId);
    service.setDateRange(startDate, endDate);

    // Trigger resource read
    service.all.value();
    TestBed.flushEffects();
    
    const req = httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockShifts);

    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.all.value)));
    expect(service.all.value()).toEqual(mockShifts);
  });

  it('should not fetch anything if any signal is undefined', () => {
    service.setContext(asBarId('bar-1'));
    service.all.value();
    TestBed.flushEffects();
    httpMock.expectNone((req) => req.url.includes('/shifts'));
  });

  it('should reload data', async () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';
    const mockShifts: Shift[] = [{ id: asShiftId('shift-1'), barId, startTime: '2026-03-20T08:00:00Z', endTime: '2026-03-20T16:00:00Z', userId: asUserId('user-1') }];

    service.setContext(barId);
    service.setDateRange(startDate, endDate);

    TestBed.flushEffects();
    httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`).flush(mockShifts);
    
    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.all.value)));
    expect(service.all.value()).toEqual(mockShifts);

    service.reload();
    TestBed.flushEffects();
    
    const req = httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`);
    req.flush(mockShifts);
    
    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.all.value)));
    expect(service.all.value()).toEqual(mockShifts);
  });
});
