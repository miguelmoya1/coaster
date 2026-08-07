import { ExecutionContext, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbRole, DbSubscriptionStatus } from '../../db';
import { SubscriptionActiveGuard } from './subscription-active.guard';

const verifyIdToken = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: (token: string) => verifyIdToken(token) }),
}));

describe('SubscriptionActiveGuard', () => {
  let guard: SubscriptionActiveGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let dbService: {
    dbUser: { findUnique: ReturnType<typeof vi.fn> };
    dbBarSubscription: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

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

  /**
   * What the guard actually sees in production: a bearer token and no `user`, because the Firebase
   * guard is controller-level and Nest runs it after every global guard.
   */
  const createRealRequestContext = (token?: string, barId = 'bar-1'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: `/api/v1/bars/${barId}/orders`,
          headers: token ? { authorization: `Bearer ${token}` } : {},
          params: { barId },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  const expiredSubscription = {
    status: DbSubscriptionStatus.TRIALING,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    trialEndsAt: new Date(Date.now() - 100000),
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

  it('should allow bar-subscription routes exempt from subscription check', async () => {
    const context = createMockContext('POST', '/bars/bar-1/bar-subscription/checkout-session', 'bar-1');

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
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() + 100000),
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

  it('should allow ACTIVE only while its Stripe period is current', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.ACTIVE,
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() - 100000),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should allow CANCELED until currentPeriodEnd and then block it', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.CANCELED,
      currentPeriodEnd: new Date(Date.now() + 100000),
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.CANCELED,
      currentPeriodEnd: new Date(Date.now() - 100000),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  describe('platform admins, identified without the auth guard having run', () => {
    it('should let an admin through on a lapsed bar using only the bearer token', async () => {
      const context = createRealRequestContext('token-admin');
      dbService.dbBarSubscription.findUnique.mockResolvedValue(expiredSubscription);
      verifyIdToken.mockResolvedValue({ sub: 'google-admin' });
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.ADMIN });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(dbService.dbUser.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'google-admin' },
        select: { role: true },
      });
    });

    it('should still block a regular user carrying a valid token', async () => {
      const context = createRealRequestContext('token-user');
      dbService.dbBarSubscription.findUnique.mockResolvedValue(expiredSubscription);
      verifyIdToken.mockResolvedValue({ sub: 'google-user' });
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should block, not crash, when the token cannot be verified', async () => {
      const context = createRealRequestContext('rubbish');
      dbService.dbBarSubscription.findUnique.mockResolvedValue(expiredSubscription);
      verifyIdToken.mockRejectedValue(new Error('invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should block when no token travels with the request', async () => {
      const context = createRealRequestContext();
      dbService.dbBarSubscription.findUnique.mockResolvedValue(expiredSubscription);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it('should not spend a token verification or a user lookup on a bar that is up to date', async () => {
      const context = createRealRequestContext('token-admin');
      dbService.dbBarSubscription.findUnique.mockResolvedValue({
        status: DbSubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date(Date.now() + 100000),
        trialEndsAt: null,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(verifyIdToken).not.toHaveBeenCalled();
      expect(dbService.dbUser.findUnique).not.toHaveBeenCalled();
    });
  });

  it('should throw HTTP 402 SUBSCRIPTION_EXPIRED when subscription status is INACTIVE or EXPIRED', async () => {
    const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbBarSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.INACTIVE,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  describe('admin-granted plans', () => {
    const lapsedStripe = {
      status: DbSubscriptionStatus.INACTIVE,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    };

    it('should grant access on an open-ended grant even with nothing paid to Stripe', async () => {
      const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
      dbService.dbBarSubscription.findUnique.mockResolvedValue({
        ...lapsedStripe,
        manualPlan: 'PRO',
        manualGrantExpiresAt: null,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(dbService.dbUser.findUnique).not.toHaveBeenCalled();
    });

    it('should grant access while a dated grant is still running', async () => {
      const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
      dbService.dbBarSubscription.findUnique.mockResolvedValue({
        ...lapsedStripe,
        manualPlan: 'PRO',
        manualGrantExpiresAt: new Date(Date.now() + 100000),
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should refuse a non-admin once the grant has run out', async () => {
      const context = createMockContext('POST', '/bars/bar-1/orders', 'bar-1', 'user-1');
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
      dbService.dbBarSubscription.findUnique.mockResolvedValue({
        ...lapsedStripe,
        manualPlan: 'PRO',
        manualGrantExpiresAt: new Date(Date.now() - 100000),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });
});
