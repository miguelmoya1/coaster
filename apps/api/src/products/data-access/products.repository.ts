import type { BarId, CategoryId, ProductId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class ProductsRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async checkCategoryBelongsToBar(categoryId: CategoryId, barId: BarId) {
    const category = await this._prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return false;
    }
    return category.barId === barId;
  }

  async create(categoryId: CategoryId, createProductDto: Omit<Prisma.ProductCreateInput, 'category'>) {
    return this._prisma.product.create({
      data: {
        ...createProductDto,
        price: createProductDto.price ?? 0,
        category: { connect: { id: categoryId } },
      },
    });
  }

  async update(productId: ProductId, updateData: Prisma.ProductUpdateInput) {
    return this._prisma.product.update({
      where: { id: productId },
      data: updateData,
    });
  }

  async findByBarId(barId: BarId) {
    return this._prisma.product.findMany({
      where: { category: { barId } },
      orderBy: { name: 'asc' },
    });
  }

  async delete(productId: ProductId) {
    return this._prisma.product.delete({
      where: { id: productId },
    });
  }
}
