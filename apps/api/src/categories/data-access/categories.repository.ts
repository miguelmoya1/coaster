import type { BarId, CategoryId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbCategoryCreateInput, DbCategoryUpdateInput, DbService } from '../../db';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly _prisma: DbService) {}

  async create(barId: BarId, createCategoryDto: Omit<DbCategoryCreateInput, 'bar'>) {
    return this._prisma.dbCategory.create({
      data: {
        bar: { connect: { id: barId } },
        ...createCategoryDto,
      },
    });
  }

  async findByBarId(barId: BarId) {
    return this._prisma.dbCategory.findMany({
      where: { barId },
      orderBy: { name: 'asc' },
    });
  }

  async update(barId: BarId, categoryId: CategoryId, dtos: DbCategoryUpdateInput) {
    return this._prisma.dbCategory.update({
      where: { id: categoryId, barId },
      data: dtos,
    });
  }

  async delete(categoryId: string) {
    return this._prisma.dbCategory.delete({
      where: { id: categoryId },
    });
  }
}
