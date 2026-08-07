import { ErrorCodes } from '@coaster/common';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbRole } from '../../db';
import { SecurityRepository } from '../data-access/security.repository';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: Reflector;
  let securityRepository: SecurityRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
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
          },
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    reflector = module.get<Reflector>(Reflector);
    securityRepository = module.get<SecurityRepository>(SecurityRepository);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no admin role is required', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(undefined);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn(),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is not present in request', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(true);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
  });

  it('should throw ForbiddenException if user does not exist in DB', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(true);
    (securityRepository.getUserRole as Mock).mockResolvedValue(undefined);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
  });

  it('should throw ForbiddenException if user does not have ADMIN role', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(true);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.USER);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
  });

  it('should return true if user has ADMIN role', async () => {
    (reflector.getAllAndOverride as Mock).mockReturnValue(true);
    (securityRepository.getUserRole as Mock).mockResolvedValue(DbRole.ADMIN);

    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'user-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
