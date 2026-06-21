import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi, Mock } from 'vitest';
import { ErrorCodes } from '../../constants';
import { DbRole } from '../../db';
import { hasPermission } from '../../permissions/bar-member.security';
import { SecurityRepository } from '../data-access/security.repository';
import { BAR_PERMISSIONS_KEY } from '../decorators/bar-permissions.decorator';
import { BarPermissionsGuard } from './bar-permissions.guard';

vi.mock('../../permissions/bar-member.security');

describe('BarPermissionsGuard', () => {
  let guard: BarPermissionsGuard;
  let reflector: Reflector;
  let securityRepository: SecurityRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarPermissionsGuard,
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
            getBarMemberRole: vi.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<BarPermissionsGuard>(BarPermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    securityRepository = module.get<SecurityRepository>(SecurityRepository);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no required permissions and no barId', async () => {
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

  it('should throw ForbiddenException if user is not present in request but permissions or barId exist', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          params: { barId: 'bar-id' },
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
          params: { barId: 'bar-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if barId is missing and user is not ADMIN', async () => {
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

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.MISSING_BAR_ID));
  });

  it('should throw ForbiddenException if membership is not found', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getBarMemberRole as Mock).mockResolvedValue(null);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { barId: 'bar-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND));
  });

  it('should throw ForbiddenException if membership is inactive', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getBarMemberRole as Mock).mockResolvedValue({ role: 'STAFF', active: false });

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { barId: 'bar-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND));
  });

  it('should return true if membership is active and has all required permissions', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getBarMemberRole as Mock).mockResolvedValue({ role: 'OWNER', active: true });
    (hasPermission as Mock).mockReturnValue(true);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { barId: 'bar-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith('OWNER', 'INVITE_MEMBER');
  });

  it('should throw ForbiddenException if membership is active but does not have required permissions', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(['INVITE_MEMBER']);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);
    (securityRepository.getBarMemberRole as Mock).mockResolvedValue({ role: 'STAFF', active: true });
    (hasPermission as Mock).mockReturnValue(false);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
          params: { barId: 'bar-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
    expect(hasPermission).toHaveBeenCalledWith('STAFF', 'INVITE_MEMBER');
  });
});
