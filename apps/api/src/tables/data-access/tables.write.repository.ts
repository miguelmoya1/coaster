import type { BarId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbTableUncheckedCreateInput, DbTableUncheckedUpdateInput } from '../../db';

type CreateTableDto = Omit<DbTableUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'barId' | 'orders'>;
type UpdateTableDto = Omit<DbTableUncheckedUpdateInput, 'id' | 'createdAt' | 'updatedAt' | 'barId' | 'orders'>;

@Injectable()
export class TablesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(barId: BarId, data: CreateTableDto) {
    return this._db.dbTable.create({
      data: { ...data, barId },
    });
  }

  public async update(tableId: TableId, data: UpdateTableDto) {
    return this._db.dbTable.update({
      where: { id: tableId },
      data,
    });
  }

  public async delete(tableId: TableId) {
    return this._db.dbTable.delete({
      where: { id: tableId },
    });
  }
}
