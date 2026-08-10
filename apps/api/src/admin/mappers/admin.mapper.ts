import type {
  AdminAuditAction,
  AdminAuditLogEntry,
  AdminAuditTargetType,
  AdminBarMember,
  AdminBarSummary,
  AdminUserBarMembership,
  AdminUserSummary,
  BarId,
  BarMemberId,
  UserId,
} from '@coaster/common';
import { BarBillingSource, BarRole, Role, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { isManualGrantActive } from '@coaster/core';
import { DbSubscriptionStatus } from '@coaster/core/db';
import { BarSubscriptionMapper } from '@coaster/bar-subscription';
import type { DbBarListRow } from '../data-access/admin-bar.read.repository';

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
  bar: { id: string; name: string };
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

const hasStripeAccess = (billing: DbBarListRow['billing'], now: Date): boolean => {
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
  toBarSummary(row: DbBarListRow, now = new Date()): AdminBarSummary {
    const billing = row.billing;
    const owner = row.members[0]?.user ?? null;
    const grantIsLive = isManualGrantActive(billing, now);
    const subscription = billing ? BarSubscriptionMapper.toDomain(billing) : null;
    const stripeAccess = hasStripeAccess(billing, now);

    const billingSource = grantIsLive
      ? BarBillingSource.MANUAL
      : stripeAccess
        ? BarBillingSource.STRIPE
        : BarBillingSource.NONE;

    return {
      id: row.id as BarId,
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

  toBarMember(row: MemberRow): AdminBarMember {
    return {
      id: row.id as BarMemberId,
      userId: row.user.id as UserId,
      name: row.user.name,
      email: row.user.email,
      photoUrl: row.user.photoUrl,
      role: row.role as BarRole,
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
      barCount: row._count.memberships,
    };
  },

  toUserBarMembership(row: MembershipRow): AdminUserBarMembership {
    return {
      barId: row.bar.id as BarId,
      barName: row.bar.name,
      role: row.role as BarRole,
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
