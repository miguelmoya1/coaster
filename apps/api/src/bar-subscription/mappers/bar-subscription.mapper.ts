import type { BarId, BarSubscription, BarSubscriptionId, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import type { DbBarSubscription } from '../../core/db';

export class BarSubscriptionMapper {
  static toDomain(dbSub: DbBarSubscription): BarSubscription {
    return {
      id: dbSub.id as BarSubscriptionId,
      barId: dbSub.barId as BarId,
      plan: dbSub.plan as SubscriptionPlan,
      status: dbSub.status as SubscriptionStatus,
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
}
