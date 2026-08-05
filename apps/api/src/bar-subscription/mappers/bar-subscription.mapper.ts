import type { BarId, BarSubscription, BarSubscriptionId } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import type { DbBarSubscription } from '../../core/db';

export class BarSubscriptionMapper {
  static toDomain(dbSub: DbBarSubscription): BarSubscription {
    return {
      id: dbSub.id as BarSubscriptionId,
      barId: dbSub.barId as BarId,
      plan: dbSub.plan as SubscriptionPlan,
      status: BarSubscriptionMapper.resolveEffectiveStatus(dbSub),
      stripeCustomerId: dbSub.stripeCustomerId,
      stripeSubscriptionId: dbSub.stripeSubscriptionId,
      currentPeriodStart: dbSub.currentPeriodStart ? dbSub.currentPeriodStart.toISOString() : null,
      currentPeriodEnd: dbSub.currentPeriodEnd ? dbSub.currentPeriodEnd.toISOString() : null,
      trialEndsAt: dbSub.trialEndsAt ? dbSub.trialEndsAt.toISOString() : null,
      canceledAt: dbSub.canceledAt ? dbSub.canceledAt.toISOString() : null,
      createdAt: dbSub.createdAt.toISOString(),
      updatedAt: dbSub.updatedAt.toISOString(),
    };
  }

  /**
   * A bar with no persisted subscription is not an error: it is simply on the free tier with
   * nothing activated. Callers always get a subscription so the client never has to special-case
   * a missing one (an absent subscription must read as locked, not as unrestricted).
   */
  static toFreeDefault(barId: BarId): BarSubscription {
    const now = new Date().toISOString();

    return {
      id: '' as BarSubscriptionId,
      barId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.INACTIVE,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * The stored status is whatever Stripe last told us; it does not age on its own. This derives
   * the status as of *now*, so a lapsed period or a finished trial reads as EXPIRED without
   * waiting for a webhook.
   */
  private static resolveEffectiveStatus(dbSub: DbBarSubscription): SubscriptionStatus {
    const status = dbSub.status as SubscriptionStatus;
    const now = new Date();

    if (status === SubscriptionStatus.ACTIVE && (!dbSub.stripeSubscriptionId || !dbSub.currentPeriodEnd)) {
      return SubscriptionStatus.INACTIVE;
    }

    if (status === SubscriptionStatus.TRIALING && dbSub.trialEndsAt && now > dbSub.trialEndsAt) {
      return SubscriptionStatus.EXPIRED;
    }

    if (
      (status === SubscriptionStatus.CANCELED || status === SubscriptionStatus.ACTIVE) &&
      dbSub.currentPeriodEnd &&
      now > dbSub.currentPeriodEnd
    ) {
      return SubscriptionStatus.EXPIRED;
    }

    return status;
  }
}
