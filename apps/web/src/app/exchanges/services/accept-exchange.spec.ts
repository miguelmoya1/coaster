import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asShiftExchangeId,
  asShiftId,
  asUserId,
  ShiftExchange,
  ShiftExchangeStatus,
} from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { AcceptExchange } from './accept-exchange';

describe('AcceptExchange', () => {
  let service: AcceptExchange;
  let exchangeRepoMock: Record<string, Mock>;

  const mockExchange: ShiftExchange = {
    createdAt: new Date(),
    id: asShiftExchangeId('exchange-1'),
    shiftId: asShiftId('shift-1'),
    requesterId: asUserId('requester-1'),
    status: ShiftExchangeStatus.APPROVED,
    requesterName: 'John',
    shiftStartTime: '2026-04-17T09:00:00.000Z',
    shiftEndTime: '2026-04-17T17:00:00.000Z',
  };

  beforeEach(() => {
    exchangeRepoMock = {
      accept: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ExchangeRepository, useValue: exchangeRepoMock }],
    });

    service = TestBed.inject(AcceptExchange);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const exchangeId = asShiftExchangeId('exchange-1');
      exchangeRepoMock['accept'].mockResolvedValue(mockExchange);

      const result = await service.execute(barId, exchangeId);

      expect(exchangeRepoMock['accept']).toHaveBeenCalledWith(barId, exchangeId);
      expect(result).toEqual(mockExchange);
    });
  });
});
