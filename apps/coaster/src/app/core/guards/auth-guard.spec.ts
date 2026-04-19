import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { Auth } from '../services/auth';
import { authGuard } from './auth-guard';

const activatedRouteSnapshotMock = {
  snapshot: {},
} as unknown as ActivatedRouteSnapshot;

const routerStateSnapshotMock = {
  url: '',
} as unknown as RouterStateSnapshot;

describe('authGuard', () => {
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree),
  };

  beforeEach(() => {
    isAuthLoaded.set(true);
    isAuthenticated.set(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true if authenticated', async () => {
    const result = await TestBed.runInInjectionContext(() => {
      const guard = authGuard(activatedRouteSnapshotMock, routerStateSnapshotMock);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(result).toBe(true);
  });

  it('should return UrlTree to login if not authenticated', async () => {
    isAuthenticated.set(false);

    const result = await TestBed.runInInjectionContext(() => {
      const guard = authGuard(activatedRouteSnapshotMock, routerStateSnapshotMock);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect((result as UrlTree & { path: string[] }).path).toEqual(['/login']);
  });

  it('should wait for auth to load before emitting', async () => {
    isAuthLoaded.set(false);

    const guardPromise = TestBed.runInInjectionContext(() => {
      const guard = authGuard(activatedRouteSnapshotMock, routerStateSnapshotMock);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    isAuthLoaded.set(true);

    const result = await guardPromise;
    expect(result).toBe(true);
  });
});
