import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, asShiftExchangeId, ShiftExchange, ShiftExchangeStatus, asUserId } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { BarExchanges } from './bar-exchanges';
import { AcceptExchange } from './accept-exchange';

describe('AcceptExchange', () => {
  let service: AcceptExchange;
  let exchangeRepoMock: Record<string, Mock>;
  let barExchangesMock: Record<string, Mock>;

  beforeEach(() => {
    exchangeRepoMock = {
      accept: vi.fn(),
    };

    barExchangesMock = {
      reload: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AcceptExchange,
        { provide: ExchangeRepository, useValue: exchangeRepoMock },
        { provide: BarExchanges, useValue: barExchangesMock },
      ],
    });

    service = TestBed.inject(AcceptExchange);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should accept an exchange and reload bar exchanges', async () => {
    const barId = asBarId('bar-1');
    const exchangeId = asShiftExchangeId('exchange-1');
    const mockExchange: ShiftExchange = { 
      id: exchangeId, 
      shiftId: asShiftId('shift-1'), 
      requesterId: asUserId('requester-1'), 
      targetId: asUserId('target-1'),
      status: ShiftExchangeStatus.APPROVED 
    };

    exchangeRepoMock['accept'].mockResolvedValue(mockExchange);

    const result = await service.execute(barId, exchangeId);

    expect(exchangeRepoMock['accept']).toHaveBeenCalledWith(barId, exchangeId);
    expect(barExchangesMock['reload']).toHaveBeenCalled();
    expect(result).toEqual(mockExchange);
  });
});
