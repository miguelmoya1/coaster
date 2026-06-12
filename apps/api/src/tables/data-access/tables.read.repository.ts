import type { BarId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class TablesReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async findByBarId(barId: BarId) {
    return this._prisma.dbTable.findMany({
      where: { barId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tableId: TableId) {
    return this._prisma.dbTable.findUnique({
      where: { id: tableId },
    });
  }
}
