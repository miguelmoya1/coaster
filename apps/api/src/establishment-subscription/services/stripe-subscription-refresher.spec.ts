import { DbSubscriptionStatus } from '@coaster/core/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeSubscriptionRefresher } from './stripe-subscription-refresher';

describe('StripeSubscriptionRefresher (establishment-subscription)', () => {
  let refresher: StripeSubscriptionRefresher;
  let stripeApiMock: any;
  let securityRepositoryMock: any;

  const stored = {
    status: DbSubscriptionStatus.ACTIVE,
    stripeSubscriptionId: 'sub_1',
    currentPeriodEnd: new Date(Date.now() - 86_400_000),
    trialEndsAt: null,
    manualPlan: null,
    manualGrantExpiresAt: null,
  };

  const liveInStripe = {
    id: 'sub_1',
    status: 'active',
    items: {
      data: [
        {
          quantity: 3,
          price: { id: 'price_pro' },
          current_period_start: Math.floor((Date.now() - 5 * 86_400_000) / 1000),
          current_period_end: Math.floor((Date.now() + 25 * 86_400_000) / 1000),
        },
      ],
    },
  };

  beforeEach(() => {
    stripeApiMock = { retrieveSubscription: vi.fn().mockResolvedValue(liveInStripe) };
    securityRepositoryMock = {
      getSubscriptionState: vi.fn().mockResolvedValue(stored),
      refreshSubscriptionState: vi.fn().mockImplementation(async (_id, snapshot) => ({ ...stored, ...snapshot })),
    };

    refresher = new StripeSubscriptionRefresher(stripeApiMock, securityRepositoryMock, { get: vi.fn() } as any);
  });

  it('should write back the period Stripe reports, which is what unlocks the venue', async () => {
    const result = await refresher.refresh('establishment-1');

    expect(securityRepositoryMock.refreshSubscriptionState).toHaveBeenCalledWith(
      'establishment-1',
      expect.objectContaining({ status: DbSubscriptionStatus.ACTIVE, stripeSubscriptionId: 'sub_1' }),
    );
    expect(result?.currentPeriodEnd?.getTime()).toBeGreaterThan(Date.now());
  });

  it('should carry the seats Stripe is billing back into the projection', async () => {
    await refresher.refresh('establishment-1');

    expect(securityRepositoryMock.refreshSubscriptionState).toHaveBeenCalledWith(
      'establishment-1',
      expect.objectContaining({ seats: 3 }),
    );
  });

  it('should not write anything for an establishment that never subscribed', async () => {
    securityRepositoryMock.getSubscriptionState.mockResolvedValue({ ...stored, stripeSubscriptionId: null });

    await refresher.refresh('establishment-1');

    expect(stripeApiMock.retrieveSubscription).not.toHaveBeenCalled();
    expect(securityRepositoryMock.refreshSubscriptionState).not.toHaveBeenCalled();
  });

  it('should leave the projection alone when Stripe no longer knows the subscription', async () => {
    stripeApiMock.retrieveSubscription.mockResolvedValue(null);

    const result = await refresher.refresh('establishment-1');

    expect(securityRepositoryMock.refreshSubscriptionState).not.toHaveBeenCalled();
    expect(result).toBe(stored);
  });
});
