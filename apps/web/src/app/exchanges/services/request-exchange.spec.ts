import { TestBed } from '@angular/core/testing';
import {
    asBarId,
    asShiftExchangeId,
    asShiftId,
    asUserId,
    CreateShiftExchangeDto,
    ShiftExchange,
    ShiftExchangeStatus,
} from '@coaster/common';
import { Mock, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { RequestExchange } from './request-exchange';

describe('RequestExchange', () => {
  let service: RequestExchange;
  let exchangeRepoMock: Record<string, Mock>;

  const mockExchange: ShiftExchange = {
    createdAt: new Date(),
    id: asShiftExchangeId('exchange-1'),
    shiftId: asShiftId('shift-1'),
    requesterId: asUserId('requester-1'),
    status: ShiftExchangeStatus.PENDING,
    requesterName: 'John',
    shiftStartTime: '2026-04-17T09:00:00.000Z',
    shiftEndTime: '2026-04-17T17:00:00.000Z',
  };

  beforeEach(() => {
    exchangeRepoMock = {
      request: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ExchangeRepository, useValue: exchangeRepoMock }],
    });

    service = TestBed.inject(RequestExchange);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const shiftId = asShiftId('shift-1');
      const dto: CreateShiftExchangeDto = { targetId: asUserId('user-2') };
      exchangeRepoMock['request'].mockResolvedValue(mockExchange);

      const result = await service.execute(barId, shiftId, dto);

      expect(exchangeRepoMock['request']).toHaveBeenCalledWith(barId, shiftId, dto);
      expect(result).toEqual(mockExchange);
    });
  });
});
