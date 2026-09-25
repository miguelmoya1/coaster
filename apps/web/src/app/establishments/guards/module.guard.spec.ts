import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { EstablishmentModule } from '@coaster/common';
import { redirectOf } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModulesStore } from '../store/modules.store';
import { moduleGuard } from './module.guard';

const route = (establishmentId: string | null) =>
  ({
    paramMap: { get: (key: string) => (key === 'establishmentId' ? establishmentId : null) },
    parent: null,
  }) as unknown as ActivatedRouteSnapshot;

describe('moduleGuard', () => {
  const modulesStoreMock = {
    loadedFor: vi.fn().mockResolvedValue(undefined),
    isModuleEnabled: vi.fn(() => true),
  };
  const routerMock = { createUrlTree: vi.fn((path: string[]) => ({ path }) as unknown as UrlTree) };

  const run = (target: ActivatedRouteSnapshot) =>
    TestBed.runInInjectionContext(() =>
      moduleGuard(EstablishmentModule.ORDERS)(target, {} as RouterStateSnapshot),
    ) as Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    modulesStoreMock.isModuleEnabled.mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: ModulesStore, useValue: modulesStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should let through an establishment that runs the module, once its settings are loaded', async () => {
    await expect(run(route('establishment-1'))).resolves.toBe(true);

    expect(modulesStoreMock.loadedFor).toHaveBeenCalledWith('establishment-1');
  });

  it('should send an establishment without the module to its dashboard', async () => {
    modulesStoreMock.isModuleEnabled.mockReturnValue(false);

    const redirect = (await redirectOf(run(route('establishment-1')))) as UrlTree & { path: string[] };

    expect(redirect.path).toEqual(['/establishments', 'establishment-1', 'dashboard']);
  });

  it('should send a route with no establishment to the picker', async () => {
    const redirect = (await redirectOf(run(route(null)))) as UrlTree & { path: string[] };

    expect(redirect.path).toEqual(['/establishments/select']);
  });
});
