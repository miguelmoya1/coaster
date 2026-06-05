import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth, FIREBASE_AUTH } from './auth';
import { User, Auth as FirebaseAuth } from 'firebase/auth';

vi.mock('firebase/auth', () => {
  return {
    onAuthStateChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        return auth.onAuthStateChanged(next);
      }
      next(null);
      return () => {
        /* empty */
      };
    }),
    onIdTokenChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onIdTokenChanged === 'function') {
        return auth.onIdTokenChanged(next);
      }
      const mockUser = {
        getIdToken: async () => 'mock-id-token',
      };
      next(mockUser);
      return () => {
        /* empty */
      };
    }),
    signOut: vi.fn((auth) => {
      if (auth && typeof auth.signOut === 'function') {
        return auth.signOut();
      }
      return Promise.resolve();
    }),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: class {},
  };
});

vi.mock('@firebase/auth', () => {
  return {
    onAuthStateChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        return auth.onAuthStateChanged(next);
      }
      next(null);
      return () => {
        /* empty */
      };
    }),
    onIdTokenChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onIdTokenChanged === 'function') {
        return auth.onIdTokenChanged(next);
      }
      const mockUser = {
        getIdToken: async () => 'mock-id-token',
      };
      next(mockUser);
      return () => {
        /* empty */
      };
    }),
    signOut: vi.fn((auth) => {
      if (auth && typeof auth.signOut === 'function') {
        return auth.signOut();
      }
      return Promise.resolve();
    }),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: class {},
  };
});

describe('Auth', () => {
  let service: Auth;

  let firebaseAuthMock: Partial<FirebaseAuth>;

  beforeEach(() => {
    firebaseAuthMock = {
      app: {} as never,
      onAuthStateChanged: (next: (user: User | null) => void) => {
        next(null);
        return () => {
          /* empty */
        };
      },
      onIdTokenChanged: (next: (user: User | null) => void) => {
        const mockUser = {
          getIdToken: async () => 'mock-id-token',
        } as unknown as User;
        next(mockUser);
        return () => {
          /* empty */
        };
      },
      signOut: vi.fn(),
    } as unknown as FirebaseAuth;

    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_AUTH, useValue: firebaseAuthMock as FirebaseAuth }],
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
