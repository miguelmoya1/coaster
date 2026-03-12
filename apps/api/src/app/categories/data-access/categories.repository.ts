import { BarId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(barId: BarId, name: string, icon?: string) {
    return this._prisma.category.create({
      data: {
        barId,
        name,
        icon,
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
