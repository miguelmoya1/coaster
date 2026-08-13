import type {
  AdminEstablishmentSubscription,
  AdminManualGrant,
  EstablishmentId,
  EstablishmentSubscription,
  EstablishmentSubscriptionId,
  ManualGrant,
} from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { isManualGrantActive } from '@coaster/core';
import type { DbEstablishmentSubscription } from '@coaster/core/db';

export type DbEstablishmentSubscriptionWithGrantor = DbEstablishmentSubscription & {
  manualGrantedByName?: string | null;
};

export class EstablishmentSubscriptionMapper {
  static toDomain(dbSub: DbEstablishmentSubscriptionWithGrantor): EstablishmentSubscription {
    const grant = EstablishmentSubscriptionMapper.resolveAdminManualGrant(dbSub);
    const manualGrant: ManualGrant | null = grant ? { plan: grant.plan, expiresAt: grant.expiresAt } : null;

    return { ...EstablishmentSubscriptionMapper.baseFields(dbSub, grant), manualGrant };
  }

  static toAdminDomain(dbSub: DbEstablishmentSubscriptionWithGrantor): AdminEstablishmentSubscription {
    const grant = EstablishmentSubscriptionMapper.resolveAdminManualGrant(dbSub);

    return { ...EstablishmentSubscriptionMapper.baseFields(dbSub, grant), manualGrant: grant };
  }

  static toFreeDefault(establishmentId: EstablishmentId): EstablishmentSubscription {
    const now = new Date().toISOString();

    return {
      id: '' as EstablishmentSubscriptionId,
      establishmentId,
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

  static toAdminFreeDefault(establishmentId: EstablishmentId): AdminEstablishmentSubscription {
    return { ...EstablishmentSubscriptionMapper.toFreeDefault(establishmentId), manualGrant: null };
  }

  private static baseFields(
    dbSub: DbEstablishmentSubscriptionWithGrantor,
    grant: AdminManualGrant | null,
  ): Omit<EstablishmentSubscription, 'manualGrant'> {
    return {
      id: dbSub.id as EstablishmentSubscriptionId,
      establishmentId: dbSub.establishmentId as EstablishmentId,
      plan: grant ? grant.plan : (dbSub.plan as SubscriptionPlan),
      status: grant ? SubscriptionStatus.ACTIVE : EstablishmentSubscriptionMapper.resolveEffectiveStatus(dbSub),
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

  private static resolveAdminManualGrant(dbSub: DbEstablishmentSubscriptionWithGrantor): AdminManualGrant | null {
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

  private static resolveEffectiveStatus(dbSub: DbEstablishmentSubscription): SubscriptionStatus {
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
