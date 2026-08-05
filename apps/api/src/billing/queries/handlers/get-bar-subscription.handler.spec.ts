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
    handler = new GetBarSubscriptionHandler(readRepoMock);
  });

  it('should return FREE inactive subscription default if bar has no subscription in DB', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue(null);

    const result = await handler.execute(new GetBarSubscriptionQuery(barId));

    expect(result).toMatchObject({
      barId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.INACTIVE,
    });
  });

  it('should return mapped subscription domain model when subscription exists in DB', async () => {
    const barId = 'bar_123' as BarId;
    const now = new Date(Date.now() - 60_000);
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const createdAt = new Date();
    const updatedAt = new Date();
    const dbSub = {
      id: 'sub_123',
      barId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
      trialEndsAt: null,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      createdAt,
      updatedAt,
    };
    readRepoMock.findSubscriptionByBarId.mockResolvedValue(dbSub);

    const result = await handler.execute(new GetBarSubscriptionQuery(barId));

    expect(result).toEqual({
      id: 'sub_123',
      barId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      canceledAt: null,
      trialEndsAt: null,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });
});

