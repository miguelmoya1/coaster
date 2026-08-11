import type { EstablishmentId, CategoryId, ProductId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsReadRepository {
  constructor(private readonly _db: DbService) {}

  public async checkCategoryBelongsToEstablishment(categoryId: CategoryId, establishmentId: EstablishmentId) {
    const category = await this._db.dbCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return false;
    }
    return category.establishmentId === establishmentId;
  }

  public async checkProductBelongsToEstablishment(productId: ProductId, establishmentId: EstablishmentId) {
    const product = await this._db.dbProduct.findFirst({
      where: { id: productId, deletedAt: null, category: { establishmentId } },
      select: { id: true },
    });

    return product !== null;
  }

  public async findByEstablishmentId(establishmentId: EstablishmentId) {
    return this._db.dbProduct.findMany({
      where: { category: { establishmentId, deletedAt: null }, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
