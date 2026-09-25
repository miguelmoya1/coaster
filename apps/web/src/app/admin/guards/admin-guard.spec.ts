import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Role } from '@coaster/common';
import { Auth, CurrentUser } from '@coaster/core';
import { redirectOf } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  const isAuthenticated = signal(true);
  const user = signal<{ role: Role } | undefined>({ role: Role.ADMIN });

  const routerMock = { createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree) };

  const run = () =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Promise<unknown>;

  beforeEach(() => {
    isAuthenticated.set(true);
    user.set({ role: Role.ADMIN });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Auth,
          useValue: {
            isAuthenticated: isAuthenticated.asReadonly(),
            ensureRestored: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: CurrentUser, useValue: { current: { value: user.asReadonly() } } },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should let an admin through', async () => {
    await expect(run()).resolves.toBe(true);
  });

  it('should send a stranger to the login page', async () => {
    isAuthenticated.set(false);

    const redirect = (await redirectOf(run())) as UrlTree & { path: string[] };

    expect(redirect.path).toEqual(['/login']);
  });

  it('should send a signed-in user who is not an admin to their establishments', async () => {
    user.set({ role: Role.USER });

    const redirect = (await redirectOf(run())) as UrlTree & { path: string[] };

    expect(redirect.path).toEqual(['/establishments/select']);
  });

  it('should wait for the profile before deciding', async () => {
    user.set(undefined);
    const guard = run();

    user.set({ role: Role.ADMIN });
    TestBed.tick();

    await expect(guard).resolves.toBe(true);
  });
});
