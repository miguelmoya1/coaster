import { EstablishmentRole, ErrorCodes, hasPermission } from '@coaster/common';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbRole } from '../../db';
import { SecurityRepository } from '../data-access/security.repository';
import { EstablishmentPermissionsGuard } from './establishment-permissions.guard';

vi.mock('@coaster/common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@coaster/common')>()),
  hasPermission: vi.fn(),
}));

describe('EstablishmentPermissionsGuard', () => {
  let guard: EstablishmentPermissionsGuard;
  let reflector: Reflector;
  let securityRepository: SecurityRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentPermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: vi.fn(),
          },
        },
        {
          provide: SecurityRepository,
          useValue: {
            getUserRole: vi.fn(),
            getEstablishmentMemberRole: vi.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<EstablishmentPermissionsGuard>(EstablishmentPermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    securityRepository = module.get<SecurityRepository>(SecurityRepository);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no required permissions and no establishmentId', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(undefined);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          params: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is not present in request but permissions or establishmentId exist', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          params: { establishmentId: 'establishment-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
  });

  it('should return true if user is ADMIN', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.ADMIN);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { establishmentId: 'establishment-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if establishmentId is missing and user is not ADMIN', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException(ErrorCodes.MISSING_ESTABLISHMENT_ID),
    );
  });

  it('should throw ForbiddenException if membership is not found', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getEstablishmentMemberRole as Mock).mockResolvedValue(null);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { establishmentId: 'establishment-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND));
  });

  it('should throw ForbiddenException if membership is inactive', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getEstablishmentMemberRole as Mock).mockResolvedValue({
      role: EstablishmentRole.STAFF,
      active: false,
    });

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { establishmentId: 'establishment-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND));
  });

  it('should return true if membership is active and has all required permissions', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getEstablishmentMemberRole as Mock).mockResolvedValue({
      role: EstablishmentRole.OWNER,
      active: true,
    });
    (hasPermission as Mock).mockReturnValue(true);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { establishmentId: 'establishment-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(EstablishmentRole.OWNER, 'INVITE_MEMBER');
  });

  it('should throw ForbiddenException if membership is active but does not have required permissions', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getEstablishmentMemberRole as Mock).mockResolvedValue({
      role: EstablishmentRole.STAFF,
      active: true,
    });
    (hasPermission as Mock).mockReturnValue(false);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { establishmentId: 'establishment-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
    expect(hasPermission).toHaveBeenCalledWith(EstablishmentRole.STAFF, 'INVITE_MEMBER');
  });
});
