import type {
  AdminAuditLogEntry,
  AdminBarDetail,
  AdminBarSummary,
  AdminPlatformMetrics,
  AdminUserDetail,
  AdminUserSummary,
  Paginated,
} from '@coaster/common';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const paginatedMapper = <T>(payload: unknown, what: string): Paginated<T> => {
  if (!isRecord(payload) || !Array.isArray(payload['items'])) {
    throw new Error(`Invalid ${what} payload`);
  }

  return {
    items: payload['items'] as T[],
    total: Number(payload['total'] ?? 0),
    page: Number(payload['page'] ?? 1),
    pageSize: Number(payload['pageSize'] ?? payload['items'].length),
  };
};

export const adminBarsMapper = (payload: unknown): Paginated<AdminBarSummary> =>
  paginatedMapper<AdminBarSummary>(payload, 'AdminBars');

export const adminUsersMapper = (payload: unknown): Paginated<AdminUserSummary> =>
  paginatedMapper<AdminUserSummary>(payload, 'AdminUsers');

export const adminAuditMapper = (payload: unknown): Paginated<AdminAuditLogEntry> =>
  paginatedMapper<AdminAuditLogEntry>(payload, 'AdminAudit');

export const adminBarDetailMapper = (payload: unknown): AdminBarDetail => {
  if (!isRecord(payload) || !isRecord(payload['bar']) || !isRecord(payload['subscription'])) {
    throw new Error('Invalid AdminBarDetail payload');
  }

  return payload as unknown as AdminBarDetail;
};

export const adminUserDetailMapper = (payload: unknown): AdminUserDetail => {
  if (!isRecord(payload) || !isRecord(payload['user'])) {
    throw new Error('Invalid AdminUserDetail payload');
  }

  return payload as unknown as AdminUserDetail;
};

export const adminMetricsMapper = (payload: unknown): AdminPlatformMetrics => {
  if (!isRecord(payload) || !isRecord(payload['bars']) || !isRecord(payload['subscriptions'])) {
    throw new Error('Invalid AdminPlatformMetrics payload');
  }

  return payload as unknown as AdminPlatformMetrics;
};
