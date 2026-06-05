import { DbRole, DbService } from '../../../db';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, Mocked, vi } from 'vitest';
import { UserRolesGuard } from './user-roles.guard';

describe('UserRolesGuard', () => {
  let guard: UserRolesGuard;
  let reflector: Mocked<Reflector>;
  let db: { dbUser: { findUnique: Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      dbUser: { findUnique: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        { provide: DbService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<UserRolesGuard>(UserRolesGuard);
    reflector = module.get(Reflector);
    db = module.get(DbService);
  });

  const mockContext = (user?: unknown) => ({
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  });

  it('should allow access if no roles are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as unknown as ExecutionContext);
    expect(result).toBe(true);
  });

  it('should allow access if required roles is an empty array', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as unknown as ExecutionContext);
    expect(result).toBe(true);
  });

  it('should throw UNAUTHORIZED if there is no user in request', async () => {
    reflector.getAllAndOverride.mockReturnValue([DbRole.ADMIN]);
    await expect(guard.canActivate(mockContext(null) as unknown as ExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw UNAUTHORIZED if user is not found in database', async () => {
    reflector.getAllAndOverride.mockReturnValue([DbRole.ADMIN]);
    db.dbUser.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(mockContext({ id: 'u1' }) as unknown as ExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw UNAUTHORIZED if user has insufficient roles', async () => {
    reflector.getAllAndOverride.mockReturnValue([DbRole.ADMIN]);
    db.dbUser.findUnique.mockResolvedValue({ id: 'u1', role: DbRole.USER });
    await expect(guard.canActivate(mockContext({ id: 'u1' }) as unknown as ExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow access if user has the required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([DbRole.ADMIN]);
    db.dbUser.findUnique.mockResolvedValue({ id: 'u1', role: DbRole.ADMIN });
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as unknown as ExecutionContext);
    expect(result).toBe(true);
  });

  it('should allow access if user has one of multiple required roles', async () => {
    reflector.getAllAndOverride.mockReturnValue([DbRole.ADMIN, DbRole.USER]);
    db.dbUser.findUnique.mockResolvedValue({ id: 'u1', role: DbRole.USER });
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as unknown as ExecutionContext);
    expect(result).toBe(true);
  });
});
