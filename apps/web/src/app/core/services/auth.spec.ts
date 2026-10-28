import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { asUserId } from '../models/user.interface';
import { Role } from '../models/role.type';
import type { AuthSession } from '../models/auth.interface';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRepository } from '../data-access/auth-repository';
import { Auth } from './auth';

const session = (accessToken = 'an-access-token'): AuthSession => ({
  accessToken,
  expiresIn: 900,
  user: {
    id: asUserId('user-1'),
    email: 'someone@coaster.test',
    name: 'Someone',
    active: true,
    role: Role.USER,
    language: 'es',
    emailVerified: true,
  },
});

describe('Auth', () => {
  let service: Auth;

  const repo = {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };

  const translate = {
    use: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthRepository, useValue: repo },
        { provide: TranslateService, useValue: translate },
      ],
    });

    service = TestBed.inject(Auth);
  });

  it('should start out not knowing whether there is a session', () => {
    expect(service.isAuthLoaded()).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
  });

  describe('ensureRestored', () => {
    it('should pick the session back up from the cookie', async () => {
      repo.refresh.mockResolvedValue(session());

      await service.ensureRestored();

      expect(service.isAuthLoaded()).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.accessToken()).toBe('an-access-token');
      expect(service.currentUser()?.email).toBe('someone@coaster.test');
    });

    it('should settle on no session when the cookie is gone', async () => {
      repo.refresh.mockRejectedValue(new Error('401'));

      await service.ensureRestored();

      expect(service.isAuthLoaded()).toBe(true);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should only ask the server once, however many callers there are', async () => {
      repo.refresh.mockResolvedValue(session());

      await Promise.all([service.ensureRestored(), service.ensureRestored(), service.ensureRestored()]);

      expect(repo.refresh).toHaveBeenCalledTimes(1);
    });

    it('should not ask again once the answer is known', async () => {
      repo.refresh.mockResolvedValue(session());

      await service.ensureRestored();
      await service.ensureRestored();

      expect(repo.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('should hand every caller in flight the same answer, with one call behind it', async () => {
      repo.refresh.mockResolvedValue(session('a-fresh-token'));

      const answers = await Promise.all([service.refresh(), service.refresh()]);

      expect(answers).toEqual(['a-fresh-token', 'a-fresh-token']);
      expect(repo.refresh).toHaveBeenCalledTimes(1);
    });

    it('should ask again on a later refresh, rather than caching the first answer forever', async () => {
      repo.refresh.mockResolvedValue(session('first'));
      await service.refresh();

      repo.refresh.mockResolvedValue(session('second'));

      await expect(service.refresh()).resolves.toBe('second');
      expect(service.accessToken()).toBe('second');
    });

    it('should answer null and drop the session when the refresh is refused', async () => {
      repo.refresh.mockResolvedValue(session());
      await service.refresh();

      repo.refresh.mockRejectedValue(new Error('401'));

      await expect(service.refresh()).resolves.toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should not reinstate a session if logout completed while a refresh was in flight', async () => {
      let resolveRefresh!: (value: AuthSession) => void;
      repo.refresh.mockImplementation(
        () =>
          new Promise<AuthSession>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
      repo.logout.mockResolvedValue(undefined);

      const refreshing = service.refresh();
      await service.logout();

      resolveRefresh(session('late-token'));
      await refreshing;

      expect(service.isAuthenticated()).toBe(false);
      expect(service.accessToken()).toBeNull();
    });
  });

  describe('language and profile sync', () => {
    it('should apply the user language as soon as the session is restored', async () => {
      repo.refresh.mockResolvedValue(session());

      await service.ensureRestored();
      TestBed.tick();

      expect(translate.use).toHaveBeenCalledWith('es');
    });

    it('should update the in-memory user and language when patchUser is called', async () => {
      repo.refresh.mockResolvedValue(session());
      await service.ensureRestored();
      TestBed.tick();

      service.patchUser({ name: 'Updated Name', language: 'en', emailVerified: false });
      TestBed.tick();

      expect(service.currentUser()?.name).toBe('Updated Name');
      expect(service.currentUser()?.emailVerified).toBe(false);
      expect(translate.use).toHaveBeenLastCalledWith('en');
    });
  });

  describe('login and register', () => {
    it('should hold on to the session a login returns', async () => {
      repo.login.mockResolvedValue(session());

      await service.login({ email: 'someone@coaster.test', password: 'a-good-enough-password' });

      expect(repo.login).toHaveBeenCalledWith({
        email: 'someone@coaster.test',
        password: 'a-good-enough-password',
      });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should leave the session alone when the login is refused', async () => {
      repo.login.mockRejectedValue(new Error('401'));

      await expect(service.login({ email: 'someone@coaster.test', password: 'not-the-password' })).rejects.toThrow();

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should hold on to the session a registration returns', async () => {
      repo.register.mockResolvedValue(session());

      await service.register({ email: 'someone@coaster.test', password: 'a-good-enough-password', name: 'Someone' });

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      repo.refresh.mockResolvedValue(session());
      await service.ensureRestored();
    });

    it('should drop the session', async () => {
      repo.logout.mockResolvedValue(undefined);

      await service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.accessToken()).toBeNull();
    });

    it('should drop the session even when the server never answered', async () => {
      repo.logout.mockRejectedValue(new Error('network'));

      await expect(service.logout()).rejects.toThrow();

      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
