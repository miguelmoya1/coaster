import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { BarExchanges } from './bar-exchanges';

describe('BarExchanges', () => {
  let service: BarExchanges;

  const repositoryMock = {
    routes: {
      listPending: vi.fn((barId: string) => `/bars/${barId}/exchanges`),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: ExchangeRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(BarExchanges);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return undefined if no barId is provided', () => {
      expect(service.execute(undefined)).toBeUndefined();
    });

    it('should return the route path if barId is provided', () => {
      const barId = asBarId('bar-1');
      const result = service.execute(barId);
      
      expect(result).toBe('/bars/bar-1/exchanges');
      expect(repositoryMock.routes.listPending).toHaveBeenCalledWith(barId);
    });
  });
});
