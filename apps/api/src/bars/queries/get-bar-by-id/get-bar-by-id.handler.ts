import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBarByIdQuery } from './get-bar-by-id.query';
import { BarRepository } from '../../data-access/bar.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { Bar } from '@coaster/common';

@QueryHandler(GetBarByIdQuery)
export class GetBarByIdHandler implements IQueryHandler<GetBarByIdQuery, Bar | null> {
  constructor(private readonly barRepository: BarRepository) {}

  async execute(query: GetBarByIdQuery): Promise<Bar | null> {
    const bar = await this.barRepository.findById(query.barId);
    if (!bar) return null;
    return BarsMapper.toDomain(bar);
  }
}
