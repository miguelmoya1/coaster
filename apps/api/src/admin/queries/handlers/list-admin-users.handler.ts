import type { AdminUserSummary, Paginated } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminUserReadRepository } from '../../data-access/admin-user.read.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { resolvePage } from '../../utils/pagination';
import { ListAdminUsersQuery } from '../impl/list-admin-users.query';

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler implements IQueryHandler<ListAdminUsersQuery, Paginated<AdminUserSummary>> {
  constructor(private readonly _readRepo: AdminUserReadRepository) {}

  async execute(query: ListAdminUsersQuery): Promise<Paginated<AdminUserSummary>> {
    const { page, pageSize } = resolvePage(query.filters);
    const { items, total } = await this._readRepo.listUsers(query.filters, page, pageSize);

    return {
      items: items.map((user) => AdminMapper.toUserSummary(user)),
      total,
      page,
      pageSize,
    };
  }
}
