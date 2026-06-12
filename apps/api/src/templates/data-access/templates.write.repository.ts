import { Injectable } from '@nestjs/common';
import {
  DbCategoryTemplateUncheckedCreateInput,
  DbCategoryTemplateUncheckedUpdateInput,
  DbProductTemplateUncheckedCreateInput,
  DbProductTemplateUncheckedUpdateInput,
  DbService,
} from '../../db';

@Injectable()
export class TemplatesWriteRepository {
  constructor(private readonly _prisma: DbService) {}

  async createCategoryTemplate(data: DbCategoryTemplateUncheckedCreateInput) {
    return this._prisma.dbCategoryTemplate.create({
      data,
    });
  }

  async updateCategoryTemplate(id: string, data: DbCategoryTemplateUncheckedUpdateInput) {
    return this._prisma.dbCategoryTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteCategoryTemplate(id: string) {
    return this._prisma.dbCategoryTemplate.delete({
      where: { id },
    });
  }

  async createProductTemplate(data: DbProductTemplateUncheckedCreateInput) {
    return this._prisma.dbProductTemplate.create({
      data,
    });
  }

  async updateProductTemplate(id: string, data: DbProductTemplateUncheckedUpdateInput) {
    return this._prisma.dbProductTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteProductTemplate(id: string) {
    return this._prisma.dbProductTemplate.delete({
      where: { id },
    });
  }

  async upsertCategoryTemplate(name: string, icon?: string | null) {
    const existing = await this._prisma.dbCategoryTemplate.findFirst({ where: { name } });
    if (existing) {
      if (existing.icon !== icon) {
        return this._prisma.dbCategoryTemplate.update({
          where: { id: existing.id },
          data: { icon },
        });
      }
      return existing;
    }
    return this._prisma.dbCategoryTemplate.create({
      data: { name, icon },
    });
  }

  async upsertProductTemplate(name: string, price: number, categoryId: string) {
    const existing = await this._prisma.dbProductTemplate.findFirst({ where: { name, categoryId } });
    if (existing) {
      if (existing.price !== price) {
        return this._prisma.dbProductTemplate.update({
          where: { id: existing.id },
          data: { price },
        });
      }
      return existing;
    }
    return this._prisma.dbProductTemplate.create({
      data: { name, price, categoryId },
    });
  }

  async createManyCategories(data: { barId: string; name: string; icon: string | null }[], skipDuplicates = true) {
    return this._prisma.dbCategory.createMany({
      data,
      skipDuplicates,
    });
  }

  async createManyProducts(
    data: { categoryId: string; name: string; price: number; currentStock: number; minStockAlert: number }[],
    skipDuplicates = true,
  ) {
    return this._prisma.dbProduct.createMany({
      data,
      skipDuplicates,
    });
  }
}
