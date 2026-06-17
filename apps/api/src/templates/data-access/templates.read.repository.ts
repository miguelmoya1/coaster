import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class TemplatesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findAllCategoryTemplates() {
    return this._db.dbCategoryTemplate.findMany({
      include: {
        products: true,
      },
    });
  }

  public async findCategoryTemplateById(id: string) {
    return this._db.dbCategoryTemplate.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });
  }

  public async findAllProductTemplates() {
    return this._db.dbProductTemplate.findMany({
      include: {
        category: true,
      },
    });
  }

  public async findProductTemplateById(id: string) {
    return this._db.dbProductTemplate.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  public async findCategoryTemplateByName(name: string) {
    return this._db.dbCategoryTemplate.findFirst({
      where: { name },
    });
  }

  public async findProductTemplateByNameAndCategoryId(name: string, categoryId: string) {
    return this._db.dbProductTemplate.findFirst({
      where: { name, categoryId },
    });
  }

  public async findCategoryTemplatesByIds(ids: string[]) {
    return this._db.dbCategoryTemplate.findMany({
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

  public async findCategoriesByBarIdAndNames(barId: string, names: string[]) {
    return this._db.dbCategory.findMany({
      where: {
        barId,
        name: {
          in: names,
        },
      },
    });
  }

  public async findProductsByCategoryIds(categoryIds: string[]) {
    return this._db.dbProduct.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
    });
  }
}
