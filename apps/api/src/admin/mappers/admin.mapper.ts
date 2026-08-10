import type {
  AdminAuditAction,
  AdminAuditLogEntry,
  AdminAuditTargetType,
  AdminEstablishmentMember,
  AdminEstablishmentSummary,
  AdminUserEstablishmentMembership,
  AdminUserSummary,
  EstablishmentId,
  EstablishmentMemberId,
  UserId,
} from '@coaster/common';
import {
  EstablishmentBillingSource,
  EstablishmentRole,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@coaster/common';
import { isManualGrantActive } from '@coaster/core';
import { DbSubscriptionStatus } from '@coaster/core/db';
import { EstablishmentSubscriptionMapper } from '@coaster/establishment-subscription';
import type { DbEstablishmentListRow } from '../data-access/admin-establishment.read.repository';

interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: Date;
  actor: { id: string; name: string; email: string };
}

interface MemberRow {
  id: string;
  role: string;
  active: boolean;
  createdAt: Date;
  user: { id: string; name: string; email: string; photoUrl: string | null };
}

interface MembershipRow {
  role: string;
  active: boolean;
  createdAt: Date;
  establishment: { id: string; name: string };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: string;
  active: boolean;
  language: string;
  createdAt: Date;
  _count: { memberships: number };
}

const hasStripeAccess = (billing: DbEstablishmentListRow['billing'], now: Date): boolean => {
  if (!billing) {
    return false;
  }

  if (
    billing.status === DbSubscriptionStatus.ACTIVE &&
    billing.stripeSubscriptionId &&
    billing.currentPeriodEnd &&
    now <= billing.currentPeriodEnd
  ) {
    return true;
  }

  if (billing.status === DbSubscriptionStatus.TRIALING && billing.trialEndsAt && now <= billing.trialEndsAt) {
    return true;
  }

  return (
    billing.status === DbSubscriptionStatus.CANCELED &&
    Boolean(billing.currentPeriodEnd) &&
    now <= billing.currentPeriodEnd!
  );
};

export const AdminMapper = {
  toEstablishmentSummary(row: DbEstablishmentListRow, now = new Date()): AdminEstablishmentSummary {
    const billing = row.billing;
    const owner = row.members[0]?.user ?? null;
    const grantIsLive = isManualGrantActive(billing, now);
    const subscription = billing ? EstablishmentSubscriptionMapper.toDomain(billing) : null;
    const stripeAccess = hasStripeAccess(billing, now);

    const billingSource = grantIsLive
      ? EstablishmentBillingSource.MANUAL
      : stripeAccess
        ? EstablishmentBillingSource.STRIPE
        : EstablishmentBillingSource.NONE;

    return {
      id: row.id as EstablishmentId,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      memberCount: row._count.members,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      plan: subscription?.plan ?? SubscriptionPlan.FREE,
      status: subscription?.status ?? SubscriptionStatus.INACTIVE,
      billingSource,
      accessEndsAt: grantIsLive
        ? (billing?.manualGrantExpiresAt?.toISOString() ?? null)
        : (billing?.currentPeriodEnd?.toISOString() ?? billing?.trialEndsAt?.toISOString() ?? null),
      hasAccess: grantIsLive || stripeAccess,
    };
  },

  toEstablishmentMember(row: MemberRow): AdminEstablishmentMember {
    return {
      id: row.id as EstablishmentMemberId,
      userId: row.user.id as UserId,
      name: row.user.name,
      email: row.user.email,
      photoUrl: row.user.photoUrl,
      role: row.role as EstablishmentRole,
      active: row.active,
      joinedAt: row.createdAt.toISOString(),
    };
  },

  toUserSummary(row: UserRow): AdminUserSummary {
    return {
      id: row.id as UserId,
      name: row.name,
      email: row.email,
      photoUrl: row.photoUrl,
      role: row.role as Role,
      active: row.active,
      language: row.language,
      createdAt: row.createdAt.toISOString(),
      establishmentCount: row._count.memberships,
    };
  },

  toUserEstablishmentMembership(row: MembershipRow): AdminUserEstablishmentMembership {
    return {
      establishmentId: row.establishment.id as EstablishmentId,
      establishmentName: row.establishment.name,
      role: row.role as EstablishmentRole,
      active: row.active,
      joinedAt: row.createdAt.toISOString(),
    };
  },

  toAuditEntry(row: AuditRow): AdminAuditLogEntry {
    return {
      id: row.id,
      action: row.action as AdminAuditAction,
      targetType: row.targetType as AdminAuditTargetType,
      targetId: row.targetId,
      targetLabel: row.targetLabel,
      reason: row.reason,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      actorId: row.actor.id as UserId,
      actorName: row.actor.name,
      actorEmail: row.actor.email,
      createdAt: row.createdAt.toISOString(),
    };
  },
};
