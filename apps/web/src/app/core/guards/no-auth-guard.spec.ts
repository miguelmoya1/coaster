import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../services/auth';
import { noAuthGuard } from './no-auth-guard';

describe('noAuthGuard', () => {
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(false);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree),
  };

  beforeEach(() => {
    isAuthLoaded.set(true);
    isAuthenticated.set(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true if not authenticated', async () => {
    const result = await TestBed.runInInjectionContext(() => {
      const guard = noAuthGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean>);
    });

    expect(result).toBe(true);
  });

  it('should return UrlTree to root if already authenticated', async () => {
    isAuthenticated.set(true);

    await TestBed.runInInjectionContext(() => {
      const guard = noAuthGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<UrlTree>);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
