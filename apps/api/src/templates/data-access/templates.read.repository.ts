import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class TemplatesReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async findAllCategoryTemplates() {
    return this._prisma.dbCategoryTemplate.findMany({
      include: {
        products: true,
      },
    });
  }

  async findCategoryTemplateById(id: string) {
    return this._prisma.dbCategoryTemplate.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });
  }

  async findAllProductTemplates() {
    return this._prisma.dbProductTemplate.findMany({
      include: {
        category: true,
      },
    });
  }

  async findProductTemplateById(id: string) {
    return this._prisma.dbProductTemplate.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async findCategoryTemplateByName(name: string) {
    return this._prisma.dbCategoryTemplate.findFirst({
      where: { name },
    });
  }

  async findProductTemplateByNameAndCategoryId(name: string, categoryId: string) {
    return this._prisma.dbProductTemplate.findFirst({
      where: { name, categoryId },
    });
  }

  async findCategoryTemplatesByIds(ids: string[]) {
    return this._prisma.dbCategoryTemplate.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        products: true,
      },
    });
  }

  async findCategoriesByBarIdAndNames(barId: string, names: string[]) {
    return this._prisma.dbCategory.findMany({
      where: {
        barId,
        name: {
          in: names,
        },
      },
    });
  }

  async findProductsByCategoryIds(categoryIds: string[]) {
    return this._prisma.dbProduct.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
    });
  }
}
