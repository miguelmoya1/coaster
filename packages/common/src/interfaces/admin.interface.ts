import { AdminAuditAction, AdminAuditTargetType } from '../constants/admin-audit-action.type';
import { BarRole } from '../constants/bar-role.type';
import { Role } from '../constants/role.type';
import { SubscriptionPlan } from '../constants/subscription-plan.type';
import { SubscriptionStatus } from '../constants/subscription-status.type';
import { BarId } from './bar.interface';
import { AdminBarSubscription } from './bar-subscription.interface';
import { UserId } from './user.interface';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const BarBillingSource = {
  NONE: 'NONE',
  STRIPE: 'STRIPE',
  MANUAL: 'MANUAL',
} as const;

export type BarBillingSource = (typeof BarBillingSource)[keyof typeof BarBillingSource];

export interface AdminBarSummary {
  id: BarId;
  name: string;
  createdAt: string;
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingSource: BarBillingSource;
  accessEndsAt: string | null;
  hasAccess: boolean;
}

export interface AdminBarMember {
  userId: UserId;
  name: string;
  email: string;
  photoUrl: string | null;
  role: BarRole;
  active: boolean;
  joinedAt: string;
}

export interface AdminBarCounters {
  categories: number;
  products: number;
  tables: number;
  orders: number;
  ordersLast30Days: number;
  revenueLast30Days: number;
}

export interface AdminBarDetail {
  bar: AdminBarSummary;
  subscription: AdminBarSubscription;
  members: AdminBarMember[];
  counters: AdminBarCounters;
  recentActivity: AdminAuditLogEntry[];
}

export interface AdminUserSummary {
  id: UserId;
  name: string;
  email: string;
  photoUrl: string | null;
  role: Role;
  active: boolean;
  language: string;
  createdAt: string;
  barCount: number;
}

export interface AdminUserBarMembership {
  barId: BarId;
  barName: string;
  role: BarRole;
  active: boolean;
  joinedAt: string;
}

export interface AdminUserDetail {
  user: AdminUserSummary;
  bars: AdminUserBarMembership[];
  recentActivity: AdminAuditLogEntry[];
}

export interface AdminPlatformMetrics {
  bars: {
    total: number;
    createdLast7Days: number;
    createdLast30Days: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    createdLast30Days: number;
  };
  subscriptions: {
    withAccess: number;
    stripe: number;
    manual: number;
    byStatus: Record<SubscriptionStatus, number>;
    byPlan: Record<SubscriptionPlan, number>;
  };
  activity: {
    ordersLast30Days: number;
    revenueLast30Days: number;
  };
}

export interface AdminAuditLogEntry {
  id: string;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId: string;
  targetLabel: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  actorId: UserId;
  actorName: string;
  actorEmail: string;
  createdAt: string;
}

export interface GrantBarPlanDto {
  plan: Exclude<SubscriptionPlan, 'FREE'>;
  durationDays?: number | null;
  reason?: string;
}

export interface RevokeBarPlanDto {
  reason?: string;
}

export interface RenameBarDto {
  name: string;
}

export interface UpdateBarMemberRoleDto {
  role: BarRole;
}

export interface UpdateAdminUserDto {
  role?: Role;
  active?: boolean;
}

export interface AdminBarsQuery {
  q?: string;
  billingSource?: BarBillingSource;
  status?: SubscriptionStatus;
  page?: number;
  pageSize?: number;
}

export interface AdminUsersQuery {
  q?: string;
  role?: Role;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditQuery {
  targetType?: AdminAuditTargetType;
  targetId?: string;
  action?: AdminAuditAction;
  page?: number;
  pageSize?: number;
}
