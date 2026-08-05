import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import type { DbBarSubscription } from '../../core/db';
import { BarSubscriptionMapper } from './bar-subscription.mapper';

describe('BarSubscriptionMapper', () => {
  it('should map DbBarSubscription to domain BarSubscription with formatted dates', () => {
    const now = new Date('2026-01-01T10:00:00.000Z');
    const periodStart = new Date('2026-01-01T00:00:00.000Z');
    const periodEnd = new Date('2026-02-01T00:00:00.000Z');

    const dbSub: DbBarSubscription = {
      id: 'sub_id_1',
      barId: 'bar_id_1',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const domain = BarSubscriptionMapper.toDomain(dbSub);

    expect(domain).toEqual({
      id: 'sub_id_1',
      barId: 'bar_id_1',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      trialEndsAt: null,
      canceledAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('should convert date fields to ISO string when dates are present', () => {
    const date = new Date('2026-03-01T12:00:00.000Z');

    const dbSub: DbBarSubscription = {
      id: 'sub_id_2',
      barId: 'bar_id_2',
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.CANCELED,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: date,
      canceledAt: date,
      createdAt: date,
      updatedAt: date,
    };

    const domain = BarSubscriptionMapper.toDomain(dbSub);

    expect(domain.trialEndsAt).toBe(date.toISOString());
    expect(domain.canceledAt).toBe(date.toISOString());
    expect(domain.stripeCustomerId).toBeNull();
    expect(domain.stripeSubscriptionId).toBeNull();
  });
});
