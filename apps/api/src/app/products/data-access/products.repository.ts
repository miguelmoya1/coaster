import {
  BarId,
  CategoryId,
  ProductId,
  ProductStatus,
} from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core';

@Injectable()
export class ProductsRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async checkCategoryBelongsToBar(categoryId: CategoryId, barId: BarId) {
    const category = await this._prisma.category.findUnique({
      where: { id: categoryId },
    });
    return category?.barId === barId;
  }

  async create(
    categoryId: CategoryId,
    name: string,
    status: ProductStatus = ProductStatus.OK,
  ) {
    return this._prisma.product.create({
      data: {
        name,
        categoryId,
        status,
      },
    });
  }

  async updateStatus(productId: ProductId, status: ProductStatus) {
    return this._prisma.product.update({
      where: { id: productId },
      data: { status },
    });
  }
}
