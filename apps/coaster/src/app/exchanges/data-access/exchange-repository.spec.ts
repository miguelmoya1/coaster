import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asShiftExchangeId,
  asShiftId,
  asUserId,
  CreateShiftExchangeDto,
  ShiftExchange,
  ShiftExchangeStatus,
} from '@coaster/interfaces';
import { ExchangeRepository } from './exchange-repository';

describe('ExchangeRepository', () => {
  let service: ExchangeRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExchangeRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call request exchange endpoint', async () => {
    const barId = asBarId('bar-1');
    const shiftId = asShiftId('shift-1');
    const dto: CreateShiftExchangeDto = { targetId: asUserId('user-2') };
    const mockExchange: ShiftExchange = {
      id: asShiftExchangeId('exchange-1'),
      shiftId,
      requesterId: asUserId('user-1'),
      targetId: asUserId('user-2'),
      status: ShiftExchangeStatus.PENDING,
    };

    const promise = service.request(barId, shiftId, dto);

    const req = httpMock.expectOne(service.routes.request(barId, shiftId));
    expect(req.request.method).toBe('POST');
    req.flush(mockExchange);

    const result = await promise;
    expect(result).toEqual(mockExchange);
  });

  it('should call accept exchange endpoint', async () => {
    const barId = asBarId('bar-1');
    const exchangeId = asShiftExchangeId('exchange-1');
    const mockExchange: ShiftExchange = {
      id: exchangeId,
      shiftId: asShiftId('shift-1'),
      requesterId: asUserId('user-1'),
      status: ShiftExchangeStatus.APPROVED,
    };

    const promise = service.accept(barId, exchangeId);

    const req = httpMock.expectOne(service.routes.accept(barId, exchangeId));
    expect(req.request.method).toBe('POST');
    req.flush(mockExchange);

    const result = await promise;
    expect(result).toEqual(mockExchange);
  });
});
