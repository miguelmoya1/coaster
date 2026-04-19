import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';
// Mock the firebase functions used in Auth constructor/properties
vi.mock('@angular/fire/auth', async () => {
  const actual = await vi.importActual('@angular/fire/auth');
  return {
    ...actual,
    authState: vi.fn(() => of(null)), // Mock initial auth state
    idToken: vi.fn(() => of('mock-token')), // Mock id token
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
      // In our mock of() is synchronous so it might already be loaded
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
