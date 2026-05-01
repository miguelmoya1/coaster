import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
      const guard = noAuthGuard({} as any, {} as any);
      return firstValueFrom(guard as any);
    });

    expect(result).toBe(true);
  });

  it('should return UrlTree to root if already authenticated', async () => {
    isAuthenticated.set(true);

    const result = await TestBed.runInInjectionContext(() => {
      const guard = noAuthGuard({} as any, {} as any);
      return firstValueFrom(guard as any);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect((result as any).path).toEqual(['/']);
  });
});
