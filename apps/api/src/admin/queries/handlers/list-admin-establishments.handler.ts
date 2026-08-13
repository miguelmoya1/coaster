import type { AdminEstablishmentSummary, Paginated } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { resolvePage } from '../../utils/pagination';
import { ListAdminEstablishmentsQuery } from '../impl/list-admin-establishments.query';

@QueryHandler(ListAdminEstablishmentsQuery)
export class ListAdminEstablishmentsHandler implements IQueryHandler<
  ListAdminEstablishmentsQuery,
  Paginated<AdminEstablishmentSummary>
> {
  constructor(private readonly _readRepo: AdminEstablishmentReadRepository) {}

  async execute(query: ListAdminEstablishmentsQuery): Promise<Paginated<AdminEstablishmentSummary>> {
    const { page, pageSize } = resolvePage(query.filters);
    const { items, total } = await this._readRepo.listEstablishments(query.filters, page, pageSize);
    const now = new Date();

    return {
      items: items.map((establishment) => AdminMapper.toEstablishmentSummary(establishment, now)),
      total,
      page,
      pageSize,
    };
  }
}
