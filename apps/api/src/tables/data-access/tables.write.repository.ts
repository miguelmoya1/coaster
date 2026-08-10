import type { EstablishmentId, TableId } from '@coaster/common';
import { DbService, DbTableUncheckedCreateInput, DbTableUncheckedUpdateInput } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type CreateTableDto = Omit<
  DbTableUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'establishmentId' | 'orders'
>;
type UpdateTableDto = Omit<
  DbTableUncheckedUpdateInput,
  'id' | 'createdAt' | 'updatedAt' | 'establishmentId' | 'orders'
>;

@Injectable()
export class TablesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(establishmentId: EstablishmentId, data: CreateTableDto) {
    return this._db.dbTable.create({
      data: { ...data, establishmentId },
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
