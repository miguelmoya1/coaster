import type {
  AdminBarSubscription,
  AdminManualGrant,
  BarId,
  BarSubscription,
  BarSubscriptionId,
  ManualGrant,
} from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { isManualGrantActive } from '@coaster/core';
import type { DbBarSubscription } from '@coaster/core/db';

export type DbBarSubscriptionWithGrantor = DbBarSubscription & { manualGrantedByName?: string | null };

export class BarSubscriptionMapper {
  static toDomain(dbSub: DbBarSubscriptionWithGrantor): BarSubscription {
    const grant = BarSubscriptionMapper.resolveAdminManualGrant(dbSub);
    const manualGrant: ManualGrant | null = grant ? { plan: grant.plan, expiresAt: grant.expiresAt } : null;

    return { ...BarSubscriptionMapper.baseFields(dbSub, grant), manualGrant };
  }

  static toAdminDomain(dbSub: DbBarSubscriptionWithGrantor): AdminBarSubscription {
    const grant = BarSubscriptionMapper.resolveAdminManualGrant(dbSub);

    return { ...BarSubscriptionMapper.baseFields(dbSub, grant), manualGrant: grant };
  }

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
      manualGrant: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  static toAdminFreeDefault(barId: BarId): AdminBarSubscription {
    return { ...BarSubscriptionMapper.toFreeDefault(barId), manualGrant: null };
  }

  private static baseFields(
    dbSub: DbBarSubscriptionWithGrantor,
    grant: AdminManualGrant | null,
  ): Omit<BarSubscription, 'manualGrant'> {
    return {
      id: dbSub.id as BarSubscriptionId,
      barId: dbSub.barId as BarId,
      plan: grant ? grant.plan : (dbSub.plan as SubscriptionPlan),
      status: grant ? SubscriptionStatus.ACTIVE : BarSubscriptionMapper.resolveEffectiveStatus(dbSub),
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

  private static resolveAdminManualGrant(dbSub: DbBarSubscriptionWithGrantor): AdminManualGrant | null {
    if (!isManualGrantActive(dbSub)) {
      return null;
    }

    return {
      plan: dbSub.manualPlan as SubscriptionPlan,
      expiresAt: dbSub.manualGrantExpiresAt ? dbSub.manualGrantExpiresAt.toISOString() : null,
      reason: dbSub.manualGrantReason,
      grantedById: dbSub.manualGrantedById,
      grantedByName: dbSub.manualGrantedByName ?? null,
      grantedAt: (dbSub.manualGrantedAt ?? dbSub.updatedAt).toISOString(),
    };
  }

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
