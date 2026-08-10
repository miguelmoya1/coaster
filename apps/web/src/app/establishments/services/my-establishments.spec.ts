import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentRepository } from '../data-access/establishment-repository';
import { MyEstablishments } from './my-establishments';

describe('MyEstablishments', () => {
  let service: MyEstablishments;
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const establishmentRepositoryMock = {
    routes: {
      myEstablishments: '/establishments',
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
        { provide: EstablishmentRepository, useValue: establishmentRepositoryMock },
      ],
    });

    service = TestBed.inject(MyEstablishments);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return the myEstablishments route when authenticated', () => {
      expect(service.execute()).toBe('/establishments');
    });

    it('should return undefined when not authenticated', () => {
      isAuthenticated.set(false);
      expect(service.execute()).toBeUndefined();
    });

    it('should return undefined when auth is not loaded', () => {
      isAuthLoaded.set(false);
      expect(service.execute()).toBeUndefined();
    });
  });
});
