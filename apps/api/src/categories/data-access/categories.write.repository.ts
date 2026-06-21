import type { BarId, CategoryId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbCategoryUncheckedCreateInput, DbCategoryUncheckedUpdateInput, DbService } from '../../core/db';

type CreateCategoryDto = Omit<DbCategoryUncheckedCreateInput, 'id' | 'barId' | 'products'>;
type UpdateCategoryDto = Omit<DbCategoryUncheckedUpdateInput, 'id' | 'barId' | 'products'>;

@Injectable()
export class CategoriesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(barId: BarId, createCategoryDto: CreateCategoryDto) {
    return this._db.dbCategory.create({
      data: {
        barId,
        ...createCategoryDto,
      },
    });
  }

  public async update(barId: BarId, categoryId: CategoryId, dtos: UpdateCategoryDto) {
    return this._db.dbCategory.update({
      where: { id: categoryId, barId },
      data: dtos,
    });
  }

  public async delete(categoryId: CategoryId) {
    return this._db.dbCategory.delete({
      where: { id: categoryId },
    });
  }
}
