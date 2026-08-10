import type {
  AdminAuditLogEntry,
  AdminEstablishmentDetail,
  AdminEstablishmentSummary,
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

export const adminEstablishmentsMapper = (payload: unknown): Paginated<AdminEstablishmentSummary> =>
  paginatedMapper<AdminEstablishmentSummary>(payload, 'AdminEstablishments');

export const adminUsersMapper = (payload: unknown): Paginated<AdminUserSummary> =>
  paginatedMapper<AdminUserSummary>(payload, 'AdminUsers');

export const adminAuditMapper = (payload: unknown): Paginated<AdminAuditLogEntry> =>
  paginatedMapper<AdminAuditLogEntry>(payload, 'AdminAudit');

export const adminEstablishmentDetailMapper = (payload: unknown): AdminEstablishmentDetail => {
  if (!isRecord(payload) || !isRecord(payload['establishment']) || !isRecord(payload['subscription'])) {
    throw new Error('Invalid AdminEstablishmentDetail payload');
  }

  return payload as unknown as AdminEstablishmentDetail;
};

export const adminUserDetailMapper = (payload: unknown): AdminUserDetail => {
  if (!isRecord(payload) || !isRecord(payload['user'])) {
    throw new Error('Invalid AdminUserDetail payload');
  }

  return payload as unknown as AdminUserDetail;
};

export const adminMetricsMapper = (payload: unknown): AdminPlatformMetrics => {
  if (!isRecord(payload) || !isRecord(payload['establishments']) || !isRecord(payload['subscriptions'])) {
    throw new Error('Invalid AdminPlatformMetrics payload');
  }

  return payload as unknown as AdminPlatformMetrics;
};
