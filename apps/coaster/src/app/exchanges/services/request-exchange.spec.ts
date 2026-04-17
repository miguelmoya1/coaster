import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asShiftId,
  asShiftExchangeId,
  CreateShiftExchangeDto,
  ShiftExchange,
  ShiftExchangeStatus,
  asUserId,
} from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { BarExchanges } from './bar-exchanges';
import { RequestExchange } from './request-exchange';

describe('RequestExchange', () => {
  let service: RequestExchange;
  let exchangeRepoMock: Record<string, Mock>;
  let barExchangesMock: Record<string, Mock>;

  beforeEach(() => {
    exchangeRepoMock = {
      request: vi.fn(),
    };

    barExchangesMock = {
      reload: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RequestExchange,
        { provide: ExchangeRepository, useValue: exchangeRepoMock },
        { provide: BarExchanges, useValue: barExchangesMock },
      ],
    });

    service = TestBed.inject(RequestExchange);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request an exchange and reload bar exchanges', async () => {
    const barId = asBarId('bar-1');
    const shiftId = asShiftId('shift-1');
    const dto: CreateShiftExchangeDto = { targetId: asUserId('target-1') };
    const mockExchange: ShiftExchange = {
      id: asShiftExchangeId('exchange-1'),
      shiftId,
      requesterId: asUserId('requester-1'),
      targetId: asUserId('target-1'),
      status: ShiftExchangeStatus.PENDING,
      requesterName: 'John',
      shiftStartTime: '2026-04-17T09:00:00.000Z',
      shiftEndTime: '2026-04-17T17:00:00.000Z',
    };

    exchangeRepoMock['request'].mockResolvedValue(mockExchange);

    const result = await service.execute(barId, shiftId, dto);

    expect(exchangeRepoMock['request']).toHaveBeenCalledWith(barId, shiftId, dto);

    expect(result).toEqual(mockExchange);
  });
});
