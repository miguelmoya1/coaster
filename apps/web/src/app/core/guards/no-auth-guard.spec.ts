import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../services/auth';
import { noAuthGuard } from './no-auth-guard';

const activatedRouteSnapshotMock = { snapshot: {} } as unknown as ActivatedRouteSnapshot;
const routerStateSnapshotMock = { url: '' } as unknown as RouterStateSnapshot;

describe('noAuthGuard', () => {
  const isAuthenticated = signal(false);

  const authMock = {
    isAuthenticated: isAuthenticated.asReadonly(),
    ensureRestored: vi.fn().mockResolvedValue(undefined),
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree),
  };

  const run = () =>
    TestBed.runInInjectionContext(() => noAuthGuard(activatedRouteSnapshotMock, routerStateSnapshotMock));

  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated.set(false);
    authMock.ensureRestored.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should let a stranger reach the login page', async () => {
    await expect(run()).resolves.toBe(true);
  });

  it('should send someone who is already signed in to their establishments', async () => {
    isAuthenticated.set(true);

    const result = (await run()) as UrlTree & { path: string[] };

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/establishments/select']);
    expect(result.path).toEqual(['/establishments/select']);
  });

  it('should pick the session back up before deciding, so a reload does not land on the login page', async () => {
    authMock.ensureRestored.mockImplementation(async () => {
      isAuthenticated.set(true);
    });

    const result = (await run()) as UrlTree & { path: string[] };

    expect(result.path).toEqual(['/establishments/select']);
  });
});
