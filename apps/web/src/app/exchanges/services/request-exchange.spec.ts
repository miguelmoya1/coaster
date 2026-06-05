import { TestBed } from '@angular/core/testing';
import type { CreateShiftExchangeDto } from '@coaster/common';
import { asBarId, asShiftId, asUserId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { RequestExchange } from './request-exchange';

describe('RequestExchange', () => {
  let service: RequestExchange;
  let exchangeRepoMock: Record<string, Mock>;

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
    it('should delegate to repository and return void', async () => {
      const barId = asBarId('bar-1');
      const shiftId = asShiftId('shift-1');
      const dto: CreateShiftExchangeDto = { targetId: asUserId('user-2') };
      exchangeRepoMock['request'].mockResolvedValue(undefined);

      const result = await service.execute(barId, shiftId, dto);

      expect(exchangeRepoMock['request']).toHaveBeenCalledWith(barId, shiftId, dto);
      expect(result).toBeUndefined();
    });
  });
});
