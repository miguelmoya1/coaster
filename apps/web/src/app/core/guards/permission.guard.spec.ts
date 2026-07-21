import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { CurrentBarStore, MyMemberStore } from '@coaster/bars';
import { BarPermission } from '@coaster/common';
import { firstValueFrom, Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  const isLoading = signal(false);
  const currentId = signal<string | undefined>('bar-1');
  const hasPermissionMock = vi.fn(() => true);

  const currentBarStoreMock = {
    currentId: currentId.asReadonly(),
    setBarId: vi.fn((id: string | undefined) => currentId.set(id)),
  };

  const myMemberStoreMock = {
    myMember: {
      isLoading: isLoading.asReadonly(),
    },
    hasPermission: hasPermissionMock,
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree),
  };

  const getMockRoute = (barId: string | null, parentBarId: string | null = null) => {
    const parentRoute = parentBarId
      ? {
          paramMap: {
            get: vi.fn((key: string) => (key === 'barId' ? parentBarId : null)),
          },
          parent: null,
        }
      : null;

    return {
      paramMap: {
        get: vi.fn((key: string) => (key === 'barId' ? barId : null)),
      },
      parent: parentRoute,
    } as unknown as ActivatedRouteSnapshot;
  };

  beforeEach(() => {
    isLoading.set(false);
    currentId.set('bar-1');
    hasPermissionMock.mockReturnValue(true);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: CurrentBarStore, useValue: currentBarStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow navigation if user has permission', async () => {
    const route = getMockRoute('bar-1');
    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(result).toBe(true);
    expect(hasPermissionMock).toHaveBeenCalledWith(BarPermission.BAR_VIEW_PRODUCTS);
  });

  it('should redirect to orders if user lacks permission but has orders permission', async () => {
    hasPermissionMock.mockImplementation((perm) => perm === BarPermission.BAR_VIEW_ORDERS);
    const route = getMockRoute('bar-1');

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/bars', 'bar-1', 'orders']);
    expect((result as unknown as { path: string[] }).path).toEqual(['/bars', 'bar-1', 'orders']);
  });

  it('should redirect to select if user lacks permission and lacks orders permission', async () => {
    hasPermissionMock.mockReturnValue(false);
    const route = getMockRoute('bar-1');

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/bars/select']);
    expect((result as unknown as { path: string[] }).path).toEqual(['/bars/select']);
  });

  it('should set bar ID in store if it does not match current route bar ID', async () => {
    currentId.set('bar-2');
    const route = getMockRoute('bar-1');

    const guardPromise = TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    // It should have called setBarId to switch the bar
    expect(currentBarStoreMock.setBarId).toHaveBeenCalledWith('bar-1');

    // Await the promise to resolve so there is no unhandled EmptyError rejection
    const result = await guardPromise;
    expect(result).toBe(true);
  });

  it('should wait for members resource to load if it is loading', async () => {
    isLoading.set(true);
    const route = getMockRoute('bar-1');

    const guardPromise = TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    // Simulate load completion
    isLoading.set(false);

    const result = await guardPromise;
    expect(result).toBe(true);
  });

  it('should find barId in parent route snapshot if not present in child', async () => {
    const route = getMockRoute(null, 'bar-parent');

    // For this test, set currentId to something else so we can see it set the parent's barId
    currentId.set('bar-other');

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(currentBarStoreMock.setBarId).toHaveBeenCalledWith('bar-parent');
    expect(result).toBe(true);
  });

  it('should redirect to root if no barId is found in active route or parent routes', async () => {
    const route = getMockRoute(null, null);

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(BarPermission.BAR_VIEW_PRODUCTS)(route, {} as unknown as RouterStateSnapshot);
      return guard as unknown as Promise<boolean | UrlTree>;
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/bars/select']);
    expect((result as unknown as { path: string[] }).path).toEqual(['/bars/select']);
  });
});
