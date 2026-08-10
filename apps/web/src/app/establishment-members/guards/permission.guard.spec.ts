import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentPermission } from '@coaster/common';
import { firstValueFrom, Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  const isLoading = signal(false);
  const currentId = signal<string | undefined>('establishment-1');
  const hasPermissionMock = vi.fn(() => true);

  const setEstablishmentIdMock = vi.fn((id: string | undefined) => currentId.set(id));

  const myMemberStoreMock = {
    myMember: {
      isLoading: isLoading.asReadonly(),
    },
    currentEstablishmentId: currentId.asReadonly(),
    setEstablishmentId: setEstablishmentIdMock,
    hasPermission: hasPermissionMock,
  };

  const routerMock = {
    createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree),
  };

  const getMockRoute = (establishmentId: string | null, parentEstablishmentId: string | null = null) => {
    const parentRoute = parentEstablishmentId
      ? {
          paramMap: {
            get: vi.fn((key: string) => (key === 'establishmentId' ? parentEstablishmentId : null)),
          },
          parent: null,
        }
      : null;

    return {
      paramMap: {
        get: vi.fn((key: string) => (key === 'establishmentId' ? establishmentId : null)),
      },
      parent: parentRoute,
    } as unknown as ActivatedRouteSnapshot;
  };

  beforeEach(() => {
    isLoading.set(false);
    currentId.set('establishment-1');
    hasPermissionMock.mockReturnValue(true);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow navigation if user has permission', async () => {
    const route = getMockRoute('establishment-1');
    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(result).toBe(true);
    expect(hasPermissionMock).toHaveBeenCalledWith(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS);
  });

  it('should redirect to orders if user lacks permission but has orders permission', async () => {
    hasPermissionMock.mockImplementation(
      (perm?: EstablishmentPermission) => perm === EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS,
    );
    const route = getMockRoute('establishment-1');

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/establishments', 'establishment-1', 'orders']);
    expect((result as unknown as { path: string[] }).path).toEqual(['/establishments', 'establishment-1', 'orders']);
  });

  it('should redirect to select if user lacks permission and lacks orders permission', async () => {
    hasPermissionMock.mockReturnValue(false);
    const route = getMockRoute('establishment-1');

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/establishments/select']);
    expect((result as unknown as { path: string[] }).path).toEqual(['/establishments/select']);
  });

  it('should set the establishment ID on its own store if it does not match the route establishment ID', async () => {
    currentId.set('establishment-2');
    const route = getMockRoute('establishment-1');

    const guardPromise = TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(setEstablishmentIdMock).toHaveBeenCalledWith('establishment-1');

    const result = await guardPromise;
    expect(result).toBe(true);
  });

  it('should wait for members resource to load if it is loading', async () => {
    isLoading.set(true);
    const route = getMockRoute('establishment-1');

    const guardPromise = TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    isLoading.set(false);

    const result = await guardPromise;
    expect(result).toBe(true);
  });

  it('should find establishmentId in parent route snapshot if not present in child', async () => {
    const route = getMockRoute(null, 'establishment-parent');

    currentId.set('establishment-other');

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return firstValueFrom(guard as Observable<boolean | UrlTree>);
    });

    expect(setEstablishmentIdMock).toHaveBeenCalledWith('establishment-parent');
    expect(result).toBe(true);
  });

  it('should redirect to root if no establishmentId is found in active route or parent routes', async () => {
    const route = getMockRoute(null, null);

    const result = await TestBed.runInInjectionContext(() => {
      const guard = permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(
        route,
        {} as unknown as RouterStateSnapshot,
      );
      return guard as unknown as Promise<boolean | UrlTree>;
    });

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/establishments/select']);
    expect((result as unknown as { path: string[] }).path).toEqual(['/establishments/select']);
  });
});
