import { asEstablishmentId } from '@coaster/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { EstablishmentExchanges } from './establishment-exchanges';

describe('EstablishmentExchanges', () => {
  let service: EstablishmentExchanges;

  const repositoryMock = {
    routes: {
      listPending: vi.fn((establishmentId: string) => `/establishments/${establishmentId}/exchanges`),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: ExchangeRepository, useValue: repositoryMock }],
    });

    service = TestBed.inject(EstablishmentExchanges);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return undefined if no establishmentId is provided', () => {
      expect(service.execute(undefined)).toBeUndefined();
    });

    it('should return the route path if establishmentId is provided', () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const result = service.execute(establishmentId);

      expect(result).toBe('/establishments/establishment-1/exchanges');
      expect(repositoryMock.routes.listPending).toHaveBeenCalledWith(establishmentId);
    });
  });
});
