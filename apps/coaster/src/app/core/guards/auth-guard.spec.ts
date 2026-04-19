import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../services/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);
  
  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path } as unknown as UrlTree)),
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
      const guard = authGuard({} as any, {} as any);
      return firstValueFrom(guard as any);
    });

    expect(result).toBe(true);
  });

  it('should return UrlTree to login if not authenticated', async () => {
    isAuthenticated.set(false);

    const result = await TestBed.runInInjectionContext(() => {
      const guard = authGuard({} as any, {} as any);
      return firstValueFrom(guard as any);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect((result as any).path).toEqual(['/login']);
  });

  it('should wait for auth to load before emitting', async () => {
    isAuthLoaded.set(false);
    
    const guardPromise = TestBed.runInInjectionContext(() => {
      const guard = authGuard({} as any, {} as any);
      return firstValueFrom(guard as any);
    });

    // Simulate delay/loading
    isAuthLoaded.set(true);

    const result = await guardPromise;
    expect(result).toBe(true);
  });
});
