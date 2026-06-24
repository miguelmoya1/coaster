import type { BarId, CategoryId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class ProductsReadRepository {
  constructor(private readonly _db: DbService) {}

  public async checkCategoryBelongsToBar(categoryId: CategoryId, barId: BarId) {
    const category = await this._db.dbCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return false;
    }
    return category.barId === barId;
  }

  public async findByBarId(barId: BarId) {
    return this._db.dbProduct.findMany({
      where: { category: { barId, deletedAt: null }, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
