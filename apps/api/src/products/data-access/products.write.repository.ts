import type { CategoryId, ProductId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbProductUncheckedCreateInput, DbProductUncheckedUpdateInput, DbService } from '../../db';

type CreateProductInput = Omit<
  DbProductUncheckedCreateInput,
  'id' | 'categoryId' | 'createdAt' | 'updatedAt' | 'orderItems'
>;
type UpdateProductInput = Omit<
  DbProductUncheckedUpdateInput,
  'id' | 'categoryId' | 'createdAt' | 'updatedAt' | 'orderItems'
>;

@Injectable()
export class ProductsWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(categoryId: CategoryId, createProductDto: CreateProductInput) {
    return this._db.dbProduct.create({
      data: {
        ...createProductDto,
        price: createProductDto.price ?? 0,
        categoryId,
      },
    });
  }

  public async update(productId: ProductId, updateData: UpdateProductInput) {
    return this._db.dbProduct.update({
      where: { id: productId },
      data: updateData,
    });
  }

  public async delete(productId: ProductId) {
    return this._db.dbProduct.delete({
      where: { id: productId },
    });
  }
}
