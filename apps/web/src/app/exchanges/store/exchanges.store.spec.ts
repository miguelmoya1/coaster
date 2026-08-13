import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import type { EstablishmentId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { ExchangesStore } from './exchanges.store';

describe('ExchangesStore', () => {
  let store: ExchangesStore;
  let httpMock: HttpTestingController;

  const currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  const currentEstablishmentStoreMock = {
    currentId: currentEstablishmentId.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      listPending: vi.fn((establishmentId: string) => `/establishments/${establishmentId}/exchanges`),
      request: vi.fn(
        (establishmentId: string, shiftId: string) => `/establishments/${establishmentId}/shifts/${shiftId}/exchanges`,
      ),
      accept: vi.fn(
        (establishmentId: string, exchangeId: string) =>
          `/establishments/${establishmentId}/exchanges/${exchangeId}/accept`,
      ),
    },
  };

  beforeEach(() => {
    currentEstablishmentId.set(undefined);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
        { provide: ExchangeRepository, useValue: repositoryMock },
      ],
    });

    store = TestBed.inject(ExchangesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('pending', () => {
    it('should be idle at start', () => {
      expect(store.exchanges.status()).toBe('idle');
    });

    it('should not fetch if establishmentId is not set', () => {
      TestBed.tick();
      httpMock.expectNone(() => true);
      expect(store.exchanges.status()).toBe('idle');
    });
  });
});
