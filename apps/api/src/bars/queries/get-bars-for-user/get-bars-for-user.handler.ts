import { Bar } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarRepository } from '../../data-access/bar.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { GetBarsForUserQuery } from './get-bars-for-user.query';

@QueryHandler(GetBarsForUserQuery)
export class GetBarsForUserHandler implements IQueryHandler<GetBarsForUserQuery, Bar[]> {
  constructor(private readonly barRepository: BarRepository) {}

  async execute(query: GetBarsForUserQuery): Promise<Bar[]> {
    const memberships = await this.barRepository.findByUserId(query.user.id);
    return memberships.map((m) => BarsMapper.toDomain(m));
  }
}
