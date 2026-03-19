import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, asShiftId, Shift, ShiftType, asUserId } from '@coaster/interfaces';
import { ShiftRepository } from '../data-access/shift-repository';
import { BarShifts } from './bar-shifts';

describe('BarShifts', () => {
  let service: BarShifts;
  let httpMock: HttpTestingController;

  const mockRoutes = { 
    list: (barId: string, startDate: string, endDate: string) => 
      `/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}` 
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of shifts when barId, startDate, and endDate are set', () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';

    const mockShifts: Shift[] = [
      { id: asShiftId('shift-1'), barId, date: '2026-03-15', type: ShiftType.MORNING, userId: asUserId('user-1') }
    ];

    service.setContext(barId);
    service.setDateRange(startDate, endDate);
    tick();

    const req = httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockShifts);

    expect(service.all.value()).toEqual(mockShifts);
  });

  it('should not fetch anything if any signal is undefined', () => {
    service.setContext(asBarId('bar-1'));
    tick();
    httpMock.expectNone((req) => req.url.includes('/shifts'));
    expect(service.all.value()).toBeUndefined();
  });
  
  it('should reload data', () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';

    const mockShifts: Shift[] = [
      { id: asShiftId('shift-1'), barId, date: '2026-03-15', type: ShiftType.MORNING, userId: asUserId('user-1') }
    ];

    service.setContext(barId);
    service.setDateRange(startDate, endDate);
    tick();

    httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`).flush(mockShifts);

    service.reload();
    tick();

    httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`).flush(mockShifts);

    expect(service.all.value()).toEqual(mockShifts);
  });
});
