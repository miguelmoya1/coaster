import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {
  asBarId,
  asShiftId,
  asShiftExchangeId,
  ShiftExchange,
  ShiftExchangeStatus,
  asUserId,
} from '@coaster/interfaces';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { BarExchanges } from './bar-exchanges';

describe('BarExchanges', () => {
  let service: BarExchanges;
  let httpMock: HttpTestingController;

  const mockRoutes = {
    listPending: (barId: string) => `/bars/${barId}/exchanges`,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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

  it('should fetch list of pending exchanges when barId is set', async () => {
    const barId = asBarId('bar-1');

    const mockExchanges: ShiftExchange[] = [
      {
        id: asShiftExchangeId('exchange-1'),
        shiftId: asShiftId('shift-1'),
        requesterId: asUserId('user-1'),
        status: ShiftExchangeStatus.PENDING,
      },
    ];

    service.setBarContext(barId);
    service.pending.value();
    TestBed.flushEffects();
    const req = httpMock.expectOne(`/bars/${barId}/exchanges`);
    expect(req.request.method).toBe('GET');
    req.flush(mockExchanges);

    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.pending.value)));
    expect(service.pending.value()).toEqual(mockExchanges);
  });

  it('should not fetch anything if barId is undefined', () => {
    TestBed.tick();
    httpMock.expectNone((req) => req.url.includes('/exchanges'));
  });
});
