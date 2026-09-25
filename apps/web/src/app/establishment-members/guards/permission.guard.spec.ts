import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { ModulesStore } from '@coaster/establishments';
import { redirectOf } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyMemberStore } from '../store/my-member.store';
import { permissionGuard } from './permission.guard';

type Redirect = UrlTree & { path: string[] };

const route = (establishmentId: string | null, parentEstablishmentId: string | null = null) =>
  ({
    paramMap: { get: (key: string) => (key === 'establishmentId' ? establishmentId : null) },
    parent: parentEstablishmentId
      ? { paramMap: { get: (key: string) => (key === 'establishmentId' ? parentEstablishmentId : null) }, parent: null }
      : null,
  }) as unknown as ActivatedRouteSnapshot;

describe('permissionGuard', () => {
  const myMemberStoreMock = {
    loadedFor: vi.fn().mockResolvedValue(undefined),
    hasPermission: vi.fn<(permission: EstablishmentPermission) => boolean>(() => true),
  };
  const modulesStoreMock = { isModuleEnabled: vi.fn(() => true) };
  const routerMock = { createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree) };

  const run = (target: ActivatedRouteSnapshot) =>
    TestBed.runInInjectionContext(() =>
      permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)(target, {} as RouterStateSnapshot),
    ) as Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    myMemberStoreMock.hasPermission.mockReturnValue(true);
    modulesStoreMock.isModuleEnabled.mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: ModulesStore, useValue: modulesStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should let through whoever holds the permission, once their membership is loaded', async () => {
    await expect(run(route('establishment-1'))).resolves.toBe(true);

    expect(myMemberStoreMock.loadedFor).toHaveBeenCalledWith('establishment-1');
    expect(myMemberStoreMock.hasPermission).toHaveBeenCalledWith(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS);
  });

  it('should decide only after the membership has loaded', async () => {
    let finishLoading!: () => void;
    myMemberStoreMock.loadedFor.mockReturnValueOnce(new Promise<void>((resolve) => (finishLoading = resolve)));
    const guard = run(route('establishment-1'));

    expect(myMemberStoreMock.hasPermission).not.toHaveBeenCalled();

    finishLoading();
    await expect(guard).resolves.toBe(true);
  });

  it('should find the establishment in a parent route', async () => {
    await run(route(null, 'establishment-parent'));

    expect(myMemberStoreMock.loadedFor).toHaveBeenCalledWith('establishment-parent');
  });

  it('should send someone without it to the first place they may go', async () => {
    myMemberStoreMock.hasPermission.mockImplementation(
      (permission) => permission === EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS,
    );

    const redirect = (await redirectOf(run(route('establishment-1')))) as Redirect;

    expect(redirect.path).toEqual(['/establishments', 'establishment-1', 'orders']);
  });

  it('should not fall back to orders in an establishment that does not run that module', async () => {
    myMemberStoreMock.hasPermission.mockImplementation(
      (permission) =>
        permission === EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS ||
        permission === EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS,
    );
    modulesStoreMock.isModuleEnabled.mockReturnValue(false);

    const redirect = (await redirectOf(run(route('establishment-1')))) as Redirect;

    expect(redirect.path).toEqual(['/establishments', 'establishment-1', 'schedule']);
  });

  it('should send someone who may go nowhere back to the establishment picker', async () => {
    myMemberStoreMock.hasPermission.mockReturnValue(false);

    const redirect = (await redirectOf(run(route('establishment-1')))) as Redirect;

    expect(redirect.path).toEqual(['/establishments/select']);
  });

  it('should send a route with no establishment to the picker without loading anything', async () => {
    const redirect = (await redirectOf(run(route(null)))) as Redirect;

    expect(redirect.path).toEqual(['/establishments/select']);
    expect(myMemberStoreMock.loadedFor).not.toHaveBeenCalled();
  });
});
