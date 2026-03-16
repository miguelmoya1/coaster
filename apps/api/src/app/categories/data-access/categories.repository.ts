import { BarId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(
    barId: BarId,
    createCategoryDto: Omit<Prisma.CategoryCreateInput, 'bar'>,
  ) {
    return this._prisma.category.create({
      data: {
        bar: { connect: { id: barId } },
        ...createCategoryDto,
      },
      include: {
        products: {
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  async findByBarId(barId: BarId) {
    return this._prisma.category.findMany({
      where: { barId },
      include: {
        products: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
