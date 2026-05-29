import { BarPermission } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, Mocked, vi } from 'vitest';
import { PrismaService } from '../../prisma/services/prisma.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Mocked<Reflector>;
  let prisma: { barMember: { findUnique: Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      barMember: { findUnique: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
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

  it('should allow access if no permissions are required and no barId is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext({ id: 'u1' }, undefined));
    expect(result).toBe(true);
  });

  it('should verify active membership and allow access if no permissions are required but barId is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
    expect(prisma.barMember.findUnique).toHaveBeenCalledWith({
      where: {
        userId_barId: {
          userId: 'u1',
          barId: 'bar-1',
        },
      },
    });
  });

  it('should throw UNAUTHORIZED if there is no user and barId is present', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS]);
    await expect(guard.canActivate(mockContext(null, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw MISSING_BAR_ID if there is no barId but permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS]);
    await expect(guard.canActivate(mockContext({ id: 'u1' }, undefined))).rejects.toThrow(ForbiddenException);
  });

  it('should throw MEMBER_NOT_FOUND if membership does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS]);
    prisma.barMember.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw MEMBER_NOT_FOUND if membership exists but is inactive', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS]);
    prisma.barMember.findUnique.mockResolvedValue({ active: false, role: 'STAFF' });
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw if the member role does not have the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.DELETE_ORDER]); // Only OWNER has this
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if the role has the permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });

  it('should allow OWNER all permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.DELETE_ORDER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'OWNER' });
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });

  it('should check all permissions and succeed if role has all of them', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS, BarPermission.CREATE_ORDER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });

  it('should check all permissions and fail if role is missing at least one of them', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarPermission.VIEW_ORDERS, BarPermission.DELETE_ORDER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    await expect(guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'))).rejects.toThrow(ForbiddenException);
  });
});
