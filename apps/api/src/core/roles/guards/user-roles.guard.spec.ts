import { Role } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, Mocked, vi } from 'vitest';
import { PrismaService } from '../../prisma/services/prisma.service';
import { UserRolesGuard } from './user-roles.guard';

describe('UserRolesGuard', () => {
  let guard: UserRolesGuard;
  let reflector: Mocked<Reflector>;
  let prisma: { user: { findUnique: Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      user: { findUnique: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<UserRolesGuard>(UserRolesGuard);
    reflector = module.get(Reflector);
    prisma = module.get(PrismaService);
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
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as any);
    expect(result).toBe(true);
  });

  it('should allow access if required roles is an empty array', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as any);
    expect(result).toBe(true);
  });

  it('should throw UNAUTHORIZED if there is no user in request', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    await expect(guard.canActivate(mockContext(null) as any)).rejects.toThrow(ForbiddenException);
  });

  it('should throw UNAUTHORIZED if user is not found in database', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(mockContext({ id: 'u1' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('should throw UNAUTHORIZED if user has insufficient roles', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.USER });
    await expect(guard.canActivate(mockContext({ id: 'u1' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if user has the required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.ADMIN });
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as any);
    expect(result).toBe(true);
  });

  it('should allow access if user has one of multiple required roles', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.USER]);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.USER });
    const result = await guard.canActivate(mockContext({ id: 'u1' }) as any);
    expect(result).toBe(true);
  });
});
