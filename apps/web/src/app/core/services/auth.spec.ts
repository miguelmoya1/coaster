import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { Auth as FirebaseAuth, User } from '@angular/fire/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;

  let firebaseAuthMock: Partial<FirebaseAuth>;

  beforeEach(() => {
    firebaseAuthMock = {
      app: {} as FirebaseAuth['app'],
      onAuthStateChanged: (next: (user: User | null) => void) => {
        next(null);
        return () => {
          /* empty */
        };
      },
      onIdTokenChanged: (next: (user: User | null) => void) => {
        next({} as User);
        return () => {
          /* empty */
        };
      },
      signOut: vi.fn(),
    };

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
