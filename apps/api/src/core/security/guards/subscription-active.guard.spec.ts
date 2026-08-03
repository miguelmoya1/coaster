import { ExecutionContext, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbRole, DbSubscriptionStatus } from '../../db';
import { SubscriptionActiveGuard } from './subscription-active.guard';

describe('SubscriptionActiveGuard', () => {
  let guard: SubscriptionActiveGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let dbService: {
    dbUser: { findUnique: ReturnType<typeof vi.fn> };
    dbBarSubscription: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };

    dbService = {
      dbUser: { findUnique: vi.fn() },
      dbBarSubscription: { findUnique: vi.fn() },
    };

    guard = new SubscriptionActiveGuard(reflector as any, dbService as any);
  });

  const createMockContext = (method: string, url: string, barId?: string, userId?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          params: { barId },
          user: userId ? { id: userId } : undefined,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should allow GET, HEAD, and OPTIONS requests', async () => {
    const contextGet = createMockContext('GET', '/bars/bar-1/orders', 'bar-1');
    const contextHead = createMockContext('HEAD', '/bars/bar-1/orders', 'bar-1');
    const contextOptions = createMockContext('OPTIONS', '/bars/bar-1/orders', 'bar-1');

    expect(await guard.canActivate(contextGet)).toBe(true);
    expect(await guard.canActivate(contextHead)).toBe(true);
    expect(await guard.canActivate(contextOptions)).toBe(true);
  });

  it('should allow requests if SkipSubscriptionCheck decorator is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1');

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow billing routes exempt from subscription check', async () => {
    const context = createMockContext('POST', '/bars/bar-1/billing/checkout-session', 'bar-1');

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow requests if no barId is present in params', async () => {
    const context = createMockContext('POST', '/users/me');

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow requests from admin users', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'admin-user');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.ADMIN });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow POST request when subscription is ACTIVE', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.ACTIVE,
    });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow POST request when status is TRIALING and trialEndsAt is in future', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.TRIALING,
      trialEndsAt: new Date(Date.now() + 100000),
    });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw HTTP 402 SUBSCRIPTION_EXPIRED when trial has ended', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.TRIALING,
      trialEndsAt: new Date(Date.now() - 100000),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should throw HTTP 402 SUBSCRIPTION_EXPIRED when subscription status is INACTIVE or EXPIRED', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.INACTIVE,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });
});
