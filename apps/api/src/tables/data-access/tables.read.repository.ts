import type { EstablishmentId, TableId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TablesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByEstablishmentId(establishmentId: EstablishmentId) {
    return this._db.dbTable.findMany({
      where: { establishmentId },
      orderBy: { name: 'asc' },
    });
  }

  public async findById(tableId: TableId) {
    return this._db.dbTable.findUnique({
      where: { id: tableId },
    });
  }
}
