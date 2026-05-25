import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTablesByBarIdQuery } from './get-tables-by-bar-id.query';
import { TablesRepository } from '../../data-access/tables.repository';
import { TablesMapper } from '../../mappers/tables.mapper';
import { Table } from '@coaster/common';

@QueryHandler(GetTablesByBarIdQuery)
export class GetTablesByBarIdHandler implements IQueryHandler<GetTablesByBarIdQuery, Table[]> {
  constructor(private readonly _tablesRepository: TablesRepository) {}

  async execute(query: GetTablesByBarIdQuery): Promise<Table[]> {
    const tables = await this._tablesRepository.findByBarId(query.barId);
    return tables.map((t) => TablesMapper.toDomain(t));
  }
}
