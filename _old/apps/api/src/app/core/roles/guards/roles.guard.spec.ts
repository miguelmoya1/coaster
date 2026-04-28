import { BarRole } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, Mocked, vi } from 'vitest';
import { PrismaService } from '../../prisma/services/prisma.service';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Mocked<Reflector>;
  let prisma: { barMember: { findUnique: Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      barMember: { findUnique: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
    prisma = module.get(PrismaService);
  });

  const mockContext = (user?: unknown, barId?: string) => ({
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { barId } }),
    }),
  });

  it('should allow access if no roles are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });

  it('should throw UNAUTHORIZED if there is no user', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    await expect(guard.canActivate(mockContext(null, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw MISSING_BAR_ID if there is no barId', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    await expect(guard.canActivate(mockContext({ id: 'u1' }, undefined))).rejects.toThrow(ForbiddenException);
  });

  it('should throw MEMBER_NOT_FOUND if membership does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw MEMBER_NOT_FOUND if membership exists but is inactive', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: false, role: 'OWNER' });
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw if the member role is insufficient', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if the role matches', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'OWNER' });
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });

  it('should allow access if there are multiple roles and member has one', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER, BarRole.STAFF]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });
});
