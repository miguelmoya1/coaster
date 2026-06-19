import type { Bar } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarReadRepository } from '../../data-access/bar.read.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { SearchBarsAsAdminQuery } from './search-bars-as-admin.query';

@QueryHandler(SearchBarsAsAdminQuery)
export class SearchBarsAsAdminHandler implements IQueryHandler<SearchBarsAsAdminQuery, Bar[]> {
  constructor(private readonly readRepo: BarReadRepository) {}

  async execute(query: SearchBarsAsAdminQuery): Promise<Bar[]> {
    const bars = await this.readRepo.searchBarsAsAdmin(query.query);
    return bars.map((b) => BarsMapper.toDomain(b));
  }
}
