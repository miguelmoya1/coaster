import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, Shift, ShiftType, asUserId } from '@coaster/interfaces';
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

  it('should be created', async () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of shifts when barId, startDate, and endDate are set', async () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';

    const mockShifts: Shift[] = [
      { id: asShiftId('shift-1'), barId, date: '2026-03-15', type: ShiftType.MORNING, userId: asUserId('user-1') },
    ];

    service.setContext(barId);
    service.setDateRange(startDate, endDate);
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockShifts);

    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
  });

  it('should not fetch anything if any signal is undefined', async () => {
    service.setContext(asBarId('bar-1'));
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    httpMock.expectNone((req) => req.url.includes('/shifts'));
    service.all.value();
  });

  it('should reload data', async () => {
    const barId = asBarId('bar-1');
    const startDate = '2026-03-01';
    const endDate = '2026-03-31';

    const mockShifts: Shift[] = [
      { id: asShiftId('shift-1'), barId, date: '2026-03-15', type: ShiftType.MORNING, userId: asUserId('user-1') },
    ];

    service.setContext(barId);
    service.setDateRange(startDate, endDate);
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`).flush(mockShifts);
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));

    service.reload();
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    httpMock.expectOne(`/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`).flush(mockShifts);
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
  });
});
