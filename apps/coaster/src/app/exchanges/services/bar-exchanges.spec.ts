import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, asShiftId, asShiftExchangeId, ShiftExchange, ShiftExchangeStatus, asUserId } from '@coaster/interfaces';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { BarExchanges } from './bar-exchanges';

describe('BarExchanges', () => {
  let service: BarExchanges;
  let httpMock: HttpTestingController;

  const mockRoutes = { 
    listPending: (barId: string) => `/bars/${barId}/exchanges` 
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ExchangeRepository,
          useValue: { routes: mockRoutes },
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

  it('should fetch list of pending exchanges when barId is set', () => {
    const barId = asBarId('bar-1');

    const mockExchanges: ShiftExchange[] = [
      { id: asShiftExchangeId('exchange-1'), shiftId: asShiftId('shift-1'), requesterId: asUserId('user-1'), status: ShiftExchangeStatus.PENDING }
    ];

    service.setBarContext(barId);
    tick();

    const req = httpMock.expectOne(`/bars/${barId}/exchanges`);
    expect(req.request.method).toBe('GET');
    req.flush(mockExchanges);

    expect(service.pending.value()).toEqual(mockExchanges);
  });

  it('should not fetch anything if barId is undefined', () => {
    tick();
    httpMock.expectNone((req) => req.url.includes('/exchanges'));
    expect(service.pending.value()).toBeUndefined();
  });
  
  it('should reload data', () => {
    const barId = asBarId('bar-1');
    const mockExchanges: ShiftExchange[] = [
      { id: asShiftExchangeId('exchange-1'), shiftId: asShiftId('shift-1'), requesterId: asUserId('user-1'), status: ShiftExchangeStatus.PENDING }
    ];

    service.setBarContext(barId);
    tick();

    httpMock.expectOne(`/bars/${barId}/exchanges`).flush(mockExchanges);

    service.reload();
    tick();

    httpMock.expectOne(`/bars/${barId}/exchanges`).flush(mockExchanges);

    expect(service.pending.value()).toEqual(mockExchanges);
  });
});
