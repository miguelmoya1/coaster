import type { CategoryId, ProductId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbProductCreateInput, DbProductUpdateInput, DbService } from '../../db';

@Injectable()
export class ProductsWriteRepository {
  constructor(private readonly _prisma: DbService) {}

  async create(categoryId: CategoryId, createProductDto: Omit<DbProductCreateInput, 'category'>) {
    return this._prisma.dbProduct.create({
      data: {
        ...createProductDto,
        price: createProductDto.price ?? 0,
        category: { connect: { id: categoryId } },
      },
    });
  }

  async update(productId: ProductId, updateData: DbProductUpdateInput) {
    return this._prisma.dbProduct.update({
      where: { id: productId },
      data: updateData,
    });
  }

  async delete(productId: ProductId) {
    return this._prisma.dbProduct.delete({
      where: { id: productId },
    });
  }
}
