import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../services/auth';
import { authGuard } from './auth-guard';

const activatedRouteSnapshotMock = { snapshot: {} } as unknown as ActivatedRouteSnapshot;
const routerStateSnapshotMock = { url: '' } as unknown as RouterStateSnapshot;

describe('authGuard', () => {
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthenticated: isAuthenticated.asReadonly(),
    ensureRestored: vi.fn().mockResolvedValue(undefined),
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree),
  };

  const run = () =>
    TestBed.runInInjectionContext(() => authGuard(activatedRouteSnapshotMock, routerStateSnapshotMock));

  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated.set(true);
    authMock.ensureRestored.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should let an authenticated visitor through', async () => {
    await expect(run()).resolves.toBe(true);
  });

  it('should send a stranger to the login page', async () => {
    isAuthenticated.set(false);

    const result = (await run()) as UrlTree & { path: string[] };

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result.path).toEqual(['/login']);
  });

  it('should pick the session back up before deciding, not after', async () => {
    isAuthenticated.set(false);

    authMock.ensureRestored.mockImplementation(async () => {
      isAuthenticated.set(true);
    });

    await expect(run()).resolves.toBe(true);
    expect(authMock.ensureRestored).toHaveBeenCalled();
  });
});
