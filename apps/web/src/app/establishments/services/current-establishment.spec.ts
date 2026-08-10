import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asEstablishmentId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentRepository } from '../data-access/establishment-repository';
import { CurrentEstablishment } from './current-establishment';

describe('CurrentEstablishment', () => {
  let service: CurrentEstablishment;
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      establishment: vi.fn().mockReturnValue('/establishments/establishment-1'),
    },
  };

  beforeEach(() => {
    isAuthLoaded.set(true);
    isAuthenticated.set(true);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Auth, useValue: authMock },
        { provide: EstablishmentRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(CurrentEstablishment);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return the establishment route when authenticated and id provided', () => {
      const establishmentId = asEstablishmentId('establishment-1');
      service.execute(establishmentId);
      expect(repositoryMock.routes.establishment).toHaveBeenCalledWith(establishmentId);
    });

    it('should return undefined when not authenticated', () => {
      isAuthenticated.set(false);
      expect(service.execute(asEstablishmentId('establishment-1'))).toBeUndefined();
    });

    it('should return undefined when auth is not loaded', () => {
      isAuthLoaded.set(false);
      expect(service.execute(asEstablishmentId('establishment-1'))).toBeUndefined();
    });

    it('should return undefined when id is undefined', () => {
      expect(service.execute(undefined)).toBeUndefined();
    });
  });
});
