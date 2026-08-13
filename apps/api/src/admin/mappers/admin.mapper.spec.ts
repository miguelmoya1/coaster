import { EstablishmentBillingSource, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import type { DbEstablishmentListRow } from '../data-access/admin-establishment.read.repository';
import { AdminMapper } from './admin.mapper';

const NOW = new Date('2026-03-01T00:00:00.000Z');

const buildRow = (billing: Partial<NonNullable<DbEstablishmentListRow['billing']>> | null): DbEstablishmentListRow =>
  ({
    id: 'establishment-1',
    name: 'El Establishment',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: NOW,
    _count: { members: 4 },
    members: [{ user: { name: 'Ana', email: 'ana@establishment.com' } }],
    billing: billing
      ? {
          id: 'sub-1',
          establishmentId: 'establishment-1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.INACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          trialEndsAt: null,
          canceledAt: null,
          manualPlan: null,
          manualGrantExpiresAt: null,
          manualGrantReason: null,
          manualGrantedById: null,
          manualGrantedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          ...billing,
        }
      : null,
  }) as unknown as DbEstablishmentListRow;

describe('AdminMapper.toEstablishmentSummary', () => {
  it('should report an establishment with no subscription row as having no access', () => {
    const summary = AdminMapper.toEstablishmentSummary(buildRow(null), NOW);

    expect(summary).toMatchObject({
      id: 'establishment-1',
      name: 'El Establishment',
      memberCount: 4,
      ownerName: 'Ana',
      ownerEmail: 'ana@establishment.com',
      billingSource: EstablishmentBillingSource.NONE,
      hasAccess: false,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.INACTIVE,
      accessEndsAt: null,
    });
  });

  it('should report a live Stripe subscription as paid access', () => {
    const periodEnd = new Date('2026-04-01T00:00:00.000Z');
    const summary = AdminMapper.toEstablishmentSummary(
      buildRow({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: periodEnd,
      }),
      NOW,
    );

    expect(summary.billingSource).toBe(EstablishmentBillingSource.STRIPE);
    expect(summary.hasAccess).toBe(true);
    expect(summary.accessEndsAt).toBe(periodEnd.toISOString());
  });

  it('should let a live grant win over the Stripe columns', () => {
    const grantEnd = new Date('2026-03-15T00:00:00.000Z');
    const summary = AdminMapper.toEstablishmentSummary(
      buildRow({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
        manualPlan: SubscriptionPlan.PRO,
        manualGrantExpiresAt: grantEnd,
        manualGrantedById: 'admin-1',
        manualGrantedAt: NOW,
      }),
      NOW,
    );

    expect(summary.billingSource).toBe(EstablishmentBillingSource.MANUAL);
    expect(summary.accessEndsAt).toBe(grantEnd.toISOString());
  });

  it('should fall back to no access once both the grant and the Stripe period have lapsed', () => {
    const summary = AdminMapper.toEstablishmentSummary(
      buildRow({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
        manualPlan: SubscriptionPlan.PRO,
        manualGrantExpiresAt: new Date('2026-02-15T00:00:00.000Z'),
      }),
      NOW,
    );

    expect(summary.billingSource).toBe(EstablishmentBillingSource.NONE);
    expect(summary.hasAccess).toBe(false);
  });
});
