import type { Table } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TablesReadRepository } from '../../data-access/tables.read.repository';
import { TablesMapper } from '../../mappers/tables.mapper';
import { GetTablesByEstablishmentIdQuery } from '../impl/get-tables-by-establishment-id.query';

@QueryHandler(GetTablesByEstablishmentIdQuery)
export class GetTablesByEstablishmentIdHandler implements IQueryHandler<GetTablesByEstablishmentIdQuery, Table[]> {
  constructor(private readonly readRepo: TablesReadRepository) {}

  async execute(query: GetTablesByEstablishmentIdQuery): Promise<Table[]> {
    const tables = await this.readRepo.findByEstablishmentId(query.establishmentId);
    return tables.map((t) => TablesMapper.toDomain(t));
  }
}
