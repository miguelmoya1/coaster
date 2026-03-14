import { BarRole } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/services/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: { barMember: { findUnique: jest.Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      barMember: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
    prisma = module.get(PrismaService);
  });

  const mockContext = (user?: unknown, barId?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { barId } }),
      }),
    }) as any;

  it('debería permitir acceso si no hay roles requeridos', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext({ id: 'u1' }, 'bar-1'));
    expect(result).toBe(true);
  });

  it('debería lanzar UNAUTHORIZED si no hay user', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    await expect(guard.canActivate(mockContext(null, 'bar-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debería lanzar MISSING_BAR_ID si no hay barId', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    await expect(
      guard.canActivate(mockContext({ id: 'u1' }, undefined)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debería lanzar MEMBER_NOT_FOUND si el membership no existe', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(mockContext({ id: 'u1' }, 'bar-1')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debería lanzar MEMBER_NOT_FOUND si membership existe pero inactivo', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: false, role: 'OWNER' });
    await expect(
      guard.canActivate(mockContext({ id: 'u1' }, 'bar-1')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debería lanzar si el rol del miembro no es suficiente', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    await expect(
      guard.canActivate(mockContext({ id: 'u1' }, 'bar-1')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debería permitir acceso si el rol coincide', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'OWNER' });
    const result = await guard.canActivate(
      mockContext({ id: 'u1' }, 'bar-1'),
    );
    expect(result).toBe(true);
  });

  it('debería permitir acceso si hay múltiples roles y el miembro tiene uno', async () => {
    reflector.getAllAndOverride.mockReturnValue([BarRole.OWNER, BarRole.STAFF]);
    prisma.barMember.findUnique.mockResolvedValue({ active: true, role: 'STAFF' });
    const result = await guard.canActivate(
      mockContext({ id: 'u1' }, 'bar-1'),
    );
    expect(result).toBe(true);
  });
});
