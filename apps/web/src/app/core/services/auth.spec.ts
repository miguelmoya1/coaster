import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountExistsWithDifferentProviderError, Auth, FIREBASE_AUTH } from './auth';
import { AuthRepository } from '../data-access/auth-repository';
import { User, Auth as FirebaseAuth, signInWithPopup } from 'firebase/auth';

vi.mock('firebase/auth', () => {
  return {
    onAuthStateChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        return auth.onAuthStateChanged(next);
      }
      next(null);
      return () => undefined;
    }),
    onIdTokenChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onIdTokenChanged === 'function') {
        return auth.onIdTokenChanged(next);
      }
      const mockUser = {
        getIdToken: async () => 'mock-id-token',
      };
      next(mockUser);
      return () => undefined;
    }),
    signOut: vi.fn((auth) => {
      if (auth && typeof auth.signOut === 'function') {
        return auth.signOut();
      }
      return Promise.resolve();
    }),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: class {
      providerId = 'google.com';
    },
    OAuthProvider: class {
      static credentialFromError = vi.fn(() => null);
      providerId: string;
      constructor(providerId: string) {
        this.providerId = providerId;
      }
    },
  };
});

vi.mock('@firebase/auth', () => {
  return {
    onAuthStateChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        return auth.onAuthStateChanged(next);
      }
      next(null);
      return () => undefined;
    }),
    onIdTokenChanged: vi.fn((auth, next) => {
      if (auth && typeof auth.onIdTokenChanged === 'function') {
        return auth.onIdTokenChanged(next);
      }
      const mockUser = {
        getIdToken: async () => 'mock-id-token',
      };
      next(mockUser);
      return () => undefined;
    }),
    signOut: vi.fn((auth) => {
      if (auth && typeof auth.signOut === 'function') {
        return auth.signOut();
      }
      return Promise.resolve();
    }),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: class {
      providerId = 'google.com';
    },
    OAuthProvider: class {
      static credentialFromError = vi.fn(() => null);
      providerId: string;
      constructor(providerId: string) {
        this.providerId = providerId;
      }
    },
  };
});

describe('Auth', () => {
  let service: Auth;
  const authRepoMock = { syncUser: vi.fn().mockResolvedValue(undefined) };

  let firebaseAuthMock: Partial<FirebaseAuth>;

  beforeEach(() => {
    firebaseAuthMock = {
      app: {} as never,
      onAuthStateChanged: (next: (user: User | null) => void) => {
        next(null);
        return () => undefined;
      },
      onIdTokenChanged: (next: (user: User | null) => void) => {
        const mockUser = {
          getIdToken: async () => 'mock-id-token',
        } as unknown as User;
        next(mockUser);
        return () => undefined;
      },
      signOut: vi.fn(),
    } as unknown as FirebaseAuth;

    TestBed.configureTestingModule({
      providers: [
        { provide: FIREBASE_AUTH, useValue: firebaseAuthMock as FirebaseAuth },
        { provide: AuthRepository, useValue: authRepoMock },
      ],
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

  describe('login', () => {
    const popup = vi.mocked(signInWithPopup);

    beforeEach(() => {
      popup.mockReset();
      authRepoMock.syncUser.mockClear();
      popup.mockResolvedValue({
        user: { getIdToken: async () => 'provider-id-token' },
      } as never);
    });

    it.each([
      ['google', 'google.com'],
      ['apple', 'apple.com'],
      ['microsoft', 'microsoft.com'],
    ] as const)('should open the popup for %s and sync the resulting token', async (provider, providerId) => {
      await service.login(provider);

      expect(popup).toHaveBeenCalledWith(firebaseAuthMock, expect.objectContaining({ providerId }));
      expect(authRepoMock.syncUser).toHaveBeenCalledWith('provider-id-token');
    });

    it('should not sync anything when the popup fails', async () => {
      popup.mockRejectedValueOnce(new Error('popup closed'));

      await expect(service.login('apple')).rejects.toThrow('popup closed');
      expect(authRepoMock.syncUser).not.toHaveBeenCalled();
    });

    it('should surface a typed error when the email already belongs to another provider', async () => {
      popup.mockRejectedValueOnce({
        code: 'auth/account-exists-with-different-credential',
        customData: { email: 'owner@establishment.com' },
      });

      await expect(service.login('microsoft')).rejects.toBeInstanceOf(AccountExistsWithDifferentProviderError);
      expect(authRepoMock.syncUser).not.toHaveBeenCalled();
    });

    it('should carry the email on the typed error so the caller can offer linking', async () => {
      popup.mockRejectedValueOnce({
        code: 'auth/account-exists-with-different-credential',
        customData: { email: 'owner@establishment.com' },
      });

      const error = await service.login('apple').catch((thrown) => thrown);

      expect(error).toMatchObject({ email: 'owner@establishment.com' });
    });
  });
});
