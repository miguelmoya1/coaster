import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { 
  asBarId, 
  asShiftExchangeId, 
  asShiftId, 
  asUserId, 
  CreateShiftExchangeDto, 
  ShiftExchange, 
  ShiftExchangeStatus 
} from '@coaster/interfaces';
import { exchangeMapper } from '../mappers/exchange.mapper';
import { ExchangeRepository } from './exchange-repository';

vi.mock('../mappers/exchange.mapper', () => ({
  exchangeMapper: vi.fn((exchange: ShiftExchange) => exchange),
}));

describe('ExchangeRepository', () => {
  let service: ExchangeRepository;
  let httpMock: HttpTestingController;

  const mockExchange: ShiftExchange = {
    id: asShiftExchangeId('exchange-1'),
    shiftId: asShiftId('shift-1'),
    requesterId: asUserId('user-1'),
    targetId: asUserId('user-2'),
    status: ShiftExchangeStatus.PENDING,
    requesterName: 'John',
    shiftStartTime: '2026-04-17T09:00:00.000Z',
    shiftEndTime: '2026-04-17T17:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(ExchangeRepository);
    httpMock = TestBed.inject(HttpTestingController);

    vi.mocked(exchangeMapper).mockClear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the listPending route', () => {
      expect(service.routes.listPending(asBarId('1'))).toBe('/bars/1/exchanges');
    });

    it('should have the request route', () => {
      expect(service.routes.request(asBarId('1'), asShiftId('2'))).toBe('/bars/1/shifts/2/exchanges');
    });

    it('should have the accept route', () => {
      expect(service.routes.accept(asBarId('1'), asShiftExchangeId('3'))).toBe('/bars/1/exchanges/3/accept');
    });
  });

  describe('request', () => {
    const barId = asBarId('bar-1');
    const shiftId = asShiftId('shift-1');
    const dto: CreateShiftExchangeDto = { targetId: asUserId('user-2') };

    it('should call request exchange endpoint', async () => {
      const promise = service.request(barId, shiftId, dto);

      const req = httpMock.expectOne(service.routes.request(barId, shiftId));
      expect(req.request.method).toBe('POST');
      req.flush(mockExchange);

      await promise;
    });

    it('should return mapped exchange', async () => {
      const res = service.request(barId, shiftId, dto);
      httpMock.expectOne(service.routes.request(barId, shiftId)).flush(mockExchange);

      expect(await res).toEqual(mockExchange);
      expect(exchangeMapper).toHaveBeenCalledWith(mockExchange);
    });
  });

  describe('accept', () => {
    const barId = asBarId('bar-1');
    const exchangeId = asShiftExchangeId('exchange-1');

    it('should call accept exchange endpoint', async () => {
      const promise = service.accept(barId, exchangeId);

      const req = httpMock.expectOne(service.routes.accept(barId, exchangeId));
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...mockExchange, status: ShiftExchangeStatus.APPROVED });

      await promise;
    });

    it('should return mapped exchange', async () => {
      const approvedExchange = { ...mockExchange, status: ShiftExchangeStatus.APPROVED };
      const res = service.accept(barId, exchangeId);
      httpMock.expectOne(service.routes.accept(barId, exchangeId)).flush(approvedExchange);

      expect(await res).toEqual(approvedExchange);
      expect(exchangeMapper).toHaveBeenCalledWith(approvedExchange);
    });
  });
});
