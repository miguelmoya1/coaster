import type { AdminAuditLogEntry, Paginated } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { resolvePage } from '../../utils/pagination';
import { ListAuditLogQuery } from '../impl/list-audit-log.query';

@QueryHandler(ListAuditLogQuery)
export class ListAuditLogHandler implements IQueryHandler<ListAuditLogQuery, Paginated<AdminAuditLogEntry>> {
  constructor(private readonly _auditRepo: AdminAuditRepository) {}

  async execute(query: ListAuditLogQuery): Promise<Paginated<AdminAuditLogEntry>> {
    const { page, pageSize } = resolvePage(query.filters);
    const { items, total } = await this._auditRepo.list(query.filters, page, pageSize);

    return {
      items: items.map((entry) => AdminMapper.toAuditEntry(entry)),
      total,
      page,
      pageSize,
    };
  }
}
