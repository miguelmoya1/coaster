import type { BarId, CategoryId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class ProductsReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async checkCategoryBelongsToBar(categoryId: CategoryId, barId: BarId) {
    const category = await this._prisma.dbCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return false;
    }
    return category.barId === barId;
  }

  async findByBarId(barId: BarId) {
    return this._prisma.dbProduct.findMany({
      where: { category: { barId } },
      orderBy: { name: 'asc' },
    });
  }
}
