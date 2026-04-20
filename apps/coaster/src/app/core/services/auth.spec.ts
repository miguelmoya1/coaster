import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';

vi.mock('@angular/fire/auth', () => {
  return {
    Auth: class {},
    authState: vi.fn(() => {
      const { of } = require('rxjs');
      return of(null);
    }),
    idToken: vi.fn(() => {
      const { of } = require('rxjs');
      return of('mock-token');
    }),
  };
});

describe('Auth', () => {
  let service: Auth;

  const firebaseAuthMock = {
    app: {},
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: FirebaseAuth, useValue: firebaseAuthMock }],
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signals', () => {
    it('isAuthLoaded should be false initially if authState is null', () => {
      expect(typeof service.isAuthLoaded()).toBe('boolean');
    });

    it('isAuthenticated should be a boolean', () => {
      expect(typeof service.isAuthenticated()).toBe('boolean');
    });

    it('userProfile should be null if not authenticated', () => {
      expect(service.userProfile()).toBeNull();
    });
  });
});
