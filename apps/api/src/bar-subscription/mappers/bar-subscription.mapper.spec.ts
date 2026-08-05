import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../core';
import type { DbBarSubscription } from '../../core/db';
import { BarSubscriptionMapper } from './bar-subscription.mapper';

const NOW = new Date('2026-01-15T00:00:00.000Z');

const buildDbSub = (overrides: Partial<DbBarSubscription> = {}): DbBarSubscription =>
  ({
    id: 'sub_id_1',
    barId: 'bar_id_1',
    plan: SubscriptionPlan.PRO,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }) as DbBarSubscription;

describe('BarSubscriptionMapper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should map DbBarSubscription to domain BarSubscription with formatted dates', () => {
    const dbSub = buildDbSub();

    const domain = BarSubscriptionMapper.toDomain(dbSub);

    expect(domain).toEqual({
      id: 'sub_id_1',
      barId: 'bar_id_1',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z').toISOString(),
      trialEndsAt: null,
      canceledAt: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it('should convert date fields to ISO string when dates are present', () => {
    const date = new Date('2026-03-01T12:00:00.000Z');
    const dbSub = buildDbSub({
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
    });

    const domain = BarSubscriptionMapper.toDomain(dbSub);

    expect(domain.trialEndsAt).toBe(date.toISOString());
    expect(domain.canceledAt).toBe(date.toISOString());
    expect(domain.stripeCustomerId).toBeNull();
    expect(domain.stripeSubscriptionId).toBeNull();
  });

  describe('effective status', () => {
    it('should downgrade ACTIVE to INACTIVE when no Stripe subscription is linked', () => {
      const domain = BarSubscriptionMapper.toDomain(buildDbSub({ stripeSubscriptionId: null }));

      expect(domain.status).toBe(SubscriptionStatus.INACTIVE);
    });

    it('should downgrade ACTIVE to INACTIVE when there is no billing period', () => {
      const domain = BarSubscriptionMapper.toDomain(buildDbSub({ currentPeriodEnd: null }));

      expect(domain.status).toBe(SubscriptionStatus.INACTIVE);
    });

    it('should report ACTIVE as EXPIRED once the period has lapsed', () => {
      const domain = BarSubscriptionMapper.toDomain(
        buildDbSub({ currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z') }),
      );

      expect(domain.status).toBe(SubscriptionStatus.EXPIRED);
    });

    it('should report TRIALING as EXPIRED once the trial has ended', () => {
      const domain = BarSubscriptionMapper.toDomain(
        buildDbSub({
          status: SubscriptionStatus.TRIALING as DbBarSubscription['status'],
          trialEndsAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      );

      expect(domain.status).toBe(SubscriptionStatus.EXPIRED);
    });

    it('should keep TRIALING while the trial is still running', () => {
      const domain = BarSubscriptionMapper.toDomain(
        buildDbSub({
          status: SubscriptionStatus.TRIALING as DbBarSubscription['status'],
          trialEndsAt: new Date('2026-02-01T00:00:00.000Z'),
        }),
      );

      expect(domain.status).toBe(SubscriptionStatus.TRIALING);
    });

    it('should keep CANCELED while the paid period has not lapsed yet', () => {
      const domain = BarSubscriptionMapper.toDomain(
        buildDbSub({ status: SubscriptionStatus.CANCELED as DbBarSubscription['status'] }),
      );

      expect(domain.status).toBe(SubscriptionStatus.CANCELED);
    });
  });

  describe('toFreeDefault', () => {
    it('should build a locked FREE subscription for a bar that has never subscribed', () => {
      const domain = BarSubscriptionMapper.toFreeDefault(asBarId('bar_id_1'));

      expect(domain).toEqual({
        id: '',
        barId: 'bar_id_1',
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEndsAt: null,
        canceledAt: null,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      });
    });
  });
});
