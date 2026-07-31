import { BarId, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetBarSubscriptionQuery } from '../impl/get-bar-subscription.query';
import { GetBarSubscriptionHandler } from './get-bar-subscription.handler';

describe('GetBarSubscriptionHandler', () => {
  let handler: GetBarSubscriptionHandler;
  let readRepoMock: any;

  beforeEach(() => {
    readRepoMock = {
      findSubscriptionByBarId: vi.fn(),
    };
    handler = new GetBarSubscriptionHandler(readRepoMock as any);
  });

  it('should return FREE inactive subscription default if bar has no subscription in DB', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue(null);

    const result = await handler.execute(new GetBarSubscriptionQuery(barId));

    expect(result).toEqual({
      barId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.INACTIVE,
      cancelAtPeriodEnd: false,
    });
  });

  it('should return mapped subscription domain model when subscription exists in DB', async () => {
    const barId = 'bar_123' as BarId;
    const now = new Date();
    const dbSub = {
      barId,
      plan: SubscriptionPlan.PRO_MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      currentPeriodStart: now,
      currentPeriodEnd: now,
      canceledAt: null,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    };
    readRepoMock.findSubscriptionByBarId.mockResolvedValue(dbSub);

    const result = await handler.execute(new GetBarSubscriptionQuery(barId));

    expect(result).toEqual({
      barId,
      plan: SubscriptionPlan.PRO_MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: now.toISOString(),
      canceledAt: undefined,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    });
  });
});
