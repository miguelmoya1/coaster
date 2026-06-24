import type { Bar } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarReadRepository } from '../../data-access/bar.read.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { GetBarsForUserQuery } from '../impl/get-bars-for-user.query';

@QueryHandler(GetBarsForUserQuery)
export class GetBarsForUserHandler implements IQueryHandler<GetBarsForUserQuery, Bar[]> {
  constructor(private readonly readRepo: BarReadRepository) {}

  async execute(query: GetBarsForUserQuery): Promise<Bar[]> {
    const memberships = await this.readRepo.findByUserId(query.user.id);
    return memberships.map((m) => BarsMapper.toDomain(m));
  }
}
