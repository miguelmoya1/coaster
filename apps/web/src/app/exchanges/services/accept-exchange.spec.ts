import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftExchangeId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { AcceptExchange } from './accept-exchange';

describe('AcceptExchange', () => {
  let service: AcceptExchange;
  let exchangeRepoMock: Record<string, Mock>;

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
    it('should delegate to repository and return void', async () => {
      const barId = asBarId('bar-1');
      const exchangeId = asShiftExchangeId('exchange-1');
      exchangeRepoMock['accept'].mockResolvedValue(undefined);

      const result = await service.execute(barId, exchangeId);

      expect(exchangeRepoMock['accept']).toHaveBeenCalledWith(barId, exchangeId);
      expect(result).toBeUndefined();
    });
  });
});
