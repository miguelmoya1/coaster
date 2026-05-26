import { BarId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';

import { Prisma, PrismaService } from '../../core';

@Injectable()
export class TablesRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async findByBarId(barId: BarId) {
    return this._prisma.table.findMany({
      where: { barId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tableId: TableId) {
    return this._prisma.table.findUnique({
      where: { id: tableId },
    });
  }

  async create(barId: BarId, data: Omit<Prisma.TableCreateInput, 'bar'>) {
    return this._prisma.table.create({
      data: {
        ...data,
        bar: { connect: { id: barId } },
      },
    });
  }

  async update(tableId: TableId, data: Prisma.TableUpdateInput) {
    return this._prisma.table.update({
      where: { id: tableId },
      data,
    });
  }

  async delete(tableId: TableId) {
    return this._prisma.table.delete({
      where: { id: tableId },
    });
  }
}
