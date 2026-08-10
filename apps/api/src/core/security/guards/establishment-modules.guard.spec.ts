import { EstablishmentModule, ErrorCodes } from '@coaster/common';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityRepository } from '../data-access/security.repository';
import { EstablishmentModulesGuard } from './establishment-modules.guard';

describe('EstablishmentModulesGuard', () => {
  let guard: EstablishmentModulesGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let repository: { getEnabledModules: ReturnType<typeof vi.fn> };

  const contextFor = (establishmentId?: string) =>
    ({
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ params: establishmentId ? { establishmentId } : {} }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    repository = { getEnabledModules: vi.fn() };
    guard = new EstablishmentModulesGuard(
      reflector as unknown as Reflector,
      repository as unknown as SecurityRepository,
    );
  });

  it('should let a route with no module requirement through without touching the database', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(contextFor('establishment-1'))).resolves.toBe(true);
    expect(repository.getEnabledModules).not.toHaveBeenCalled();
  });

  it('should let a route through when its module is on', async () => {
    reflector.getAllAndOverride.mockReturnValue([EstablishmentModule.ORDERS]);
    repository.getEnabledModules.mockResolvedValue([EstablishmentModule.TIME_TRACKING, EstablishmentModule.ORDERS]);

    await expect(guard.canActivate(contextFor('establishment-1'))).resolves.toBe(true);
  });

  it('should refuse a route whose module the establishment does not run', async () => {
    reflector.getAllAndOverride.mockReturnValue([EstablishmentModule.ORDERS]);
    repository.getEnabledModules.mockResolvedValue([EstablishmentModule.TIME_TRACKING]);

    await expect(guard.canActivate(contextFor('establishment-1'))).rejects.toThrow(
      new ForbiddenException(ErrorCodes.MODULE_NOT_ENABLED),
    );
  });

  it('should stay out of the way on a route that carries no establishment id', async () => {
    reflector.getAllAndOverride.mockReturnValue([EstablishmentModule.ORDERS]);

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
    expect(repository.getEnabledModules).not.toHaveBeenCalled();
  });
});
