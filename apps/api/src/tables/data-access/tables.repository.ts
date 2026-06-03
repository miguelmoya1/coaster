import type { BarId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { Db, DbService } from '../../db';;

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

  async create(barId: BarId, data: Omit<Db.DbTableCreateInput, 'bar'>) {
    return this._prisma.dbTable.create({
      data: {
        ...data,
        bar: { connect: { id: barId } },
      },
    });
  }

  async update(tableId: TableId, data: Db.DbTableUpdateInput) {
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
