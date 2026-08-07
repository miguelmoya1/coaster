import type { AdminBarSummary, Paginated } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { resolvePage } from '../../utils/pagination';
import { ListAdminBarsQuery } from '../impl/list-admin-bars.query';

@QueryHandler(ListAdminBarsQuery)
export class ListAdminBarsHandler implements IQueryHandler<ListAdminBarsQuery, Paginated<AdminBarSummary>> {
  constructor(private readonly _readRepo: AdminBarReadRepository) {}

  async execute(query: ListAdminBarsQuery): Promise<Paginated<AdminBarSummary>> {
    const { page, pageSize } = resolvePage(query.filters);
    const { items, total } = await this._readRepo.listBars(query.filters, page, pageSize);
    const now = new Date();

    return {
      items: items.map((bar) => AdminMapper.toBarSummary(bar, now)),
      total,
      page,
      pageSize,
    };
  }
}
