import type { Table } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TablesReadRepository } from '../../data-access/tables.read.repository';
import { TablesMapper } from '../../mappers/tables.mapper';
import { GetTablesByBarIdQuery } from './get-tables-by-bar-id.query';

@QueryHandler(GetTablesByBarIdQuery)
export class GetTablesByBarIdHandler implements IQueryHandler<GetTablesByBarIdQuery, Table[]> {
  constructor(private readonly readRepo: TablesReadRepository) {}

  async execute(query: GetTablesByBarIdQuery): Promise<Table[]> {
    const tables = await this.readRepo.findByBarId(query.barId);
    return tables.map((t) => TablesMapper.toDomain(t));
  }
}
