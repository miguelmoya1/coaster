import type { BarId, TableId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TablesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByBarId(barId: BarId) {
    return this._db.dbTable.findMany({
      where: { barId },
      orderBy: { name: 'asc' },
    });
  }

  public async findById(tableId: TableId) {
    return this._db.dbTable.findUnique({
      where: { id: tableId },
    });
  }
}
