import type { BarId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbTableCreateInput, DbTableUpdateInput } from '../../db';

@Injectable()
export class TablesRepository {
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

  async create(barId: BarId, data: Omit<DbTableCreateInput, 'bar'>) {
    return this._prisma.dbTable.create({
      data: {
        ...data,
        bar: { connect: { id: barId } },
      },
    });
  }

  async update(tableId: TableId, data: DbTableUpdateInput) {
    return this._prisma.dbTable.update({
      where: { id: tableId },
      data,
    });
  }

  async delete(tableId: TableId) {
    return this._prisma.dbTable.delete({
      where: { id: tableId },
    });
  }
}
