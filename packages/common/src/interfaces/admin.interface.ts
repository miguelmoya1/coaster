import { AdminAuditAction, AdminAuditTargetType } from '../constants/admin-audit-action.type';
import { EstablishmentRole } from '../constants/establishment-role.type';
import { Role } from '../constants/role.type';
import { SubscriptionPlan } from '../constants/subscription-plan.type';
import { SubscriptionStatus } from '../constants/subscription-status.type';
import { EstablishmentMemberId } from './establishment-member.interface';
import { EstablishmentId } from './establishment.interface';
import { AdminEstablishmentSubscription } from './establishment-subscription.interface';
import { UserId } from './user.interface';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const EstablishmentBillingSource = {
  NONE: 'NONE',
  STRIPE: 'STRIPE',
  MANUAL: 'MANUAL',
} as const;

export type EstablishmentBillingSource = (typeof EstablishmentBillingSource)[keyof typeof EstablishmentBillingSource];

export interface AdminEstablishmentSummary {
  id: EstablishmentId;
  name: string;
  createdAt: string;
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingSource: EstablishmentBillingSource;
  accessEndsAt: string | null;
  hasAccess: boolean;
}

export interface AdminEstablishmentMember {
  id: EstablishmentMemberId;
  userId: UserId;
  name: string;
  email: string;
  photoUrl: string | null;
  role: EstablishmentRole;
  active: boolean;
  joinedAt: string;
}

export interface AdminEstablishmentCounters {
  categories: number;
  products: number;
  tables: number;
  orders: number;
  ordersLast30Days: number;
  revenueLast30Days: number;
}

export interface AdminEstablishmentDetail {
  establishment: AdminEstablishmentSummary;
  subscription: AdminEstablishmentSubscription;
  members: AdminEstablishmentMember[];
  counters: AdminEstablishmentCounters;
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
  establishmentCount: number;
}

export interface AdminUserEstablishmentMembership {
  establishmentId: EstablishmentId;
  establishmentName: string;
  role: EstablishmentRole;
  active: boolean;
  joinedAt: string;
}

export interface AdminUserDetail {
  user: AdminUserSummary;
  establishments: AdminUserEstablishmentMembership[];
  recentActivity: AdminAuditLogEntry[];
}

export interface AdminPlatformMetrics {
  establishments: {
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

export interface GrantEstablishmentPlanDto {
  plan: Exclude<SubscriptionPlan, 'FREE'>;
  durationDays?: number | null;
  reason?: string;
}

export interface RevokeEstablishmentPlanDto {
  reason?: string;
}

export interface RenameEstablishmentDto {
  name: string;
}

export interface UpdateAdminUserDto {
  role?: Role;
  active?: boolean;
}

export interface AdminEstablishmentsQuery {
  q?: string;
  billingSource?: EstablishmentBillingSource;
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
