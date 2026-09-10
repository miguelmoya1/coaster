import { ExecutionContext, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { passThroughCache } from '../../../../test/utils/passthrough-cache';
import { DbRole, DbSubscriptionStatus } from '../../db';
import { SecurityRepository } from '../data-access/security.repository';
import { SubscriptionActiveGuard } from './subscription-active.guard';
import { AccessTokenService } from '../services/access-token.service';

const TEST_SECRET = 'a-secret-only-the-suite-knows';

describe('SubscriptionActiveGuard', () => {
  let guard: SubscriptionActiveGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let dbService: {
    dbUser: { findUnique: ReturnType<typeof vi.fn> };
    dbEstablishmentSubscription: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  };
  let refresher: { refresh: ReturnType<typeof vi.fn> };
  let tokens: AccessTokenService;

  beforeEach(() => {
    vi.clearAllMocks();

    reflector = {
      getAllAndOverride: vi.fn(),
    };

    dbService = {
      dbUser: { findUnique: vi.fn() },
      dbEstablishmentSubscription: { findUnique: vi.fn(), update: vi.fn() },
    };

    refresher = { refresh: vi.fn().mockResolvedValue(null) };

    tokens = new AccessTokenService(dbService as any, passThroughCache, { get: () => TEST_SECRET } as any);

    guard = new SubscriptionActiveGuard(
      reflector as any,
      new SecurityRepository(dbService as any, passThroughCache),
      tokens,
      { get: () => refresher } as any,
    );
  });

  const createMockContext = (
    method: string,
    url: string,
    establishmentId?: string,
    userId?: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          params: { establishmentId },
          user: userId ? { id: userId } : undefined,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  const createRealRequestContext = (token?: string, establishmentId = 'establishment-1'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: `/api/v1/establishments/${establishmentId}/orders`,
          headers: token ? { authorization: `Bearer ${token}` } : {},
          params: { establishmentId },
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
    const contextGet = createMockContext('GET', '/establishments/establishment-1/orders', 'establishment-1');
    const contextHead = createMockContext('HEAD', '/establishments/establishment-1/orders', 'establishment-1');
    const contextOptions = createMockContext('OPTIONS', '/establishments/establishment-1/orders', 'establishment-1');

    expect(await guard.canActivate(contextGet)).toBe(true);
    expect(await guard.canActivate(contextHead)).toBe(true);
    expect(await guard.canActivate(contextOptions)).toBe(true);
  });

  it('should allow requests if SkipSubscriptionCheck decorator is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1');

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow establishment-subscription routes exempt from subscription check', async () => {
    const context = createMockContext(
      'POST',
      '/establishments/establishment-1/establishment-subscription/checkout-session',
      'establishment-1',
    );

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow requests if no establishmentId is present in params', async () => {
    const context = createMockContext('POST', '/users/me');

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow requests from admin users', async () => {
    const context = createMockContext(
      'POST',
      '/establishments/establishment-1/orders',
      'establishment-1',
      'admin-user',
    );
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.ADMIN });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow POST request when subscription is ACTIVE', async () => {
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.ACTIVE,
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() + 100000),
    });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow POST request when status is TRIALING and trialEndsAt is in future', async () => {
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.TRIALING,
      trialEndsAt: new Date(Date.now() + 100000),
    });

    expect(await guard.canActivate(context)).toBe(true);
  });

  describe('while Stripe is still retrying a failed card', () => {
    it('should let the venue keep working, since Stripe has not given the payment up', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        status: DbSubscriptionStatus.PAST_DUE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date(Date.now() - 100000),
      });

      expect(await guard.canActivate(context)).toBe(true);
    });

    it('should block once Stripe has given up and marked it unpaid', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        status: DbSubscriptionStatus.UNPAID,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date(Date.now() - 100000),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });

  describe('when the stored subscription disagrees with Stripe', () => {
    const lapsedLocally = {
      status: DbSubscriptionStatus.ACTIVE,
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() - 100000),
    };

    it('should let a venue Stripe still considers paid keep working', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(lapsedLocally);
      refresher.refresh.mockResolvedValue({
        ...lapsedLocally,
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      });

      expect(await guard.canActivate(context)).toBe(true);
      expect(refresher.refresh).toHaveBeenCalledWith('establishment-1');
    });

    it('should keep blocking when Stripe agrees the subscription is gone', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(lapsedLocally);
      refresher.refresh.mockResolvedValue(lapsedLocally);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should never ask Stripe about an establishment that never subscribed', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        status: DbSubscriptionStatus.INACTIVE,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(refresher.refresh).not.toHaveBeenCalled();
    });

    it('should keep blocking, not crash, when Stripe cannot be reached', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(lapsedLocally);
      refresher.refresh.mockRejectedValue(new Error('Stripe unavailable'));

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });

  it('should throw HTTP 402 SUBSCRIPTION_EXPIRED when trial has ended', async () => {
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.TRIALING,
      trialEndsAt: new Date(Date.now() - 100000),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should allow ACTIVE only while its Stripe period is current', async () => {
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.ACTIVE,
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(Date.now() - 100000),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should allow CANCELED until currentPeriodEnd and then block it', async () => {
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.CANCELED,
      currentPeriodEnd: new Date(Date.now() + 100000),
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      status: DbSubscriptionStatus.CANCELED,
      currentPeriodEnd: new Date(Date.now() - 100000),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  describe('platform admins, identified without the auth guard having run', () => {
    it('should let an admin through on a lapsed establishment using only the bearer token', async () => {
      const context = createRealRequestContext(await tokens.sign('user-admin', 'session-1'));
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(expiredSubscription);
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.ADMIN });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(dbService.dbUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-admin' },
        include: { preferences: true },
        omit: { passwordHash: true },
      });
    });

    it('should still block a regular user carrying a valid token', async () => {
      const context = createRealRequestContext(await tokens.sign('user-1', 'session-1'));
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(expiredSubscription);
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should block, not crash, when the token cannot be verified', async () => {
      const context = createRealRequestContext('rubbish');
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(expiredSubscription);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should block when no token travels with the request', async () => {
      const context = createRealRequestContext();
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue(expiredSubscription);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(dbService.dbUser.findUnique).not.toHaveBeenCalled();
    });

    it('should not spend a token verification or a user lookup on an establishment that is up to date', async () => {
      const context = createRealRequestContext(await tokens.sign('user-admin', 'session-1'));
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        status: DbSubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date(Date.now() + 100000),
        trialEndsAt: null,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(dbService.dbUser.findUnique).not.toHaveBeenCalled();
    });
  });

  it('should throw HTTP 402 SUBSCRIPTION_EXPIRED when subscription status is INACTIVE or EXPIRED', async () => {
    const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
    dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
    dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
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
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        ...lapsedStripe,
        manualPlan: 'PRO',
        manualGrantExpiresAt: null,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(dbService.dbUser.findUnique).not.toHaveBeenCalled();
    });

    it('should grant access while a dated grant is still running', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        ...lapsedStripe,
        manualPlan: 'PRO',
        manualGrantExpiresAt: new Date(Date.now() + 100000),
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should refuse a non-admin once the grant has run out', async () => {
      const context = createMockContext('POST', '/establishments/establishment-1/orders', 'establishment-1', 'user-1');
      dbService.dbUser.findUnique.mockResolvedValue({ role: DbRole.USER });
      dbService.dbEstablishmentSubscription.findUnique.mockResolvedValue({
        ...lapsedStripe,
        manualPlan: 'PRO',
        manualGrantExpiresAt: new Date(Date.now() - 100000),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });
});
