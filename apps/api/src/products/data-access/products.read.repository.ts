import type { BarId, CategoryId, ProductId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

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

  public async checkProductBelongsToBar(productId: ProductId, barId: BarId) {
    const product = await this._db.dbProduct.findFirst({
      where: { id: productId, deletedAt: null, category: { barId } },
      select: { id: true },
    });

    return product !== null;
  }

  public async findByBarId(barId: BarId) {
    return this._db.dbProduct.findMany({
      where: { category: { barId, deletedAt: null }, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
