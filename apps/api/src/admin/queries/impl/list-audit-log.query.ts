import type { AdminAuditQuery } from '@coaster/common';

export class ListAuditLogQuery {
  constructor(public readonly filters: AdminAuditQuery) {}
}
