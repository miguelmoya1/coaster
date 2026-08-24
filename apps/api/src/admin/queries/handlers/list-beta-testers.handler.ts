import type { BetaTester, Paginated } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminBetaTesterRepository } from '../../data-access/admin-beta-tester.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { resolvePage } from '../../utils/pagination';
import { ListBetaTestersQuery } from '../impl/list-beta-testers.query';

@QueryHandler(ListBetaTestersQuery)
export class ListBetaTestersHandler implements IQueryHandler<ListBetaTestersQuery, Paginated<BetaTester>> {
  constructor(private readonly _repo: AdminBetaTesterRepository) {}

  async execute(query: ListBetaTestersQuery): Promise<Paginated<BetaTester>> {
    const { page, pageSize } = resolvePage(query.filters);
    const { items, total } = await this._repo.list(query.filters, page, pageSize);
    const signUps = await this._repo.findSignUps(items.map((item) => item.email));
    const byEmail = new Map(signUps.map((signUp) => [signUp.email, signUp]));

    return {
      items: items.map((item) => AdminMapper.toBetaTester(item, byEmail.get(item.email) ?? null)),
      total,
      page,
      pageSize,
    };
  }
}
