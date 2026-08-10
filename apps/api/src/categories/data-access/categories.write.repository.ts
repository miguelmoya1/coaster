import type { EstablishmentId, CategoryId } from '@coaster/common';
import { DbCategoryUncheckedCreateInput, DbCategoryUncheckedUpdateInput, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type CreateCategoryDto = Omit<DbCategoryUncheckedCreateInput, 'id' | 'establishmentId' | 'products'>;
type UpdateCategoryDto = Omit<DbCategoryUncheckedUpdateInput, 'id' | 'establishmentId' | 'products'>;

@Injectable()
export class CategoriesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(establishmentId: EstablishmentId, createCategoryDto: CreateCategoryDto) {
    return this._db.dbCategory.create({
      data: {
        establishmentId,
        ...createCategoryDto,
      },
    });
  }

  public async update(establishmentId: EstablishmentId, categoryId: CategoryId, dtos: UpdateCategoryDto) {
    return this._db.dbCategory.update({
      where: { id: categoryId, establishmentId },
      data: dtos,
    });
  }

  public async delete(establishmentId: EstablishmentId, categoryId: CategoryId) {
    return this._db.dbCategory.update({
      where: { id: categoryId, establishmentId },
      data: { deletedAt: new Date() },
    });
  }
}
