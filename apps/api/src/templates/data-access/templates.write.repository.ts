import { Injectable } from '@nestjs/common';
import {
  DbCategoryTemplateUncheckedCreateInput,
  DbCategoryTemplateUncheckedUpdateInput,
  DbProductTemplateUncheckedCreateInput,
  DbProductTemplateUncheckedUpdateInput,
  DbService,
} from '../../core/db';

type CreateCategoryTemplateDto = Omit<
  DbCategoryTemplateUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'products'
>;
type UpdateCategoryTemplateDto = Omit<
  DbCategoryTemplateUncheckedUpdateInput,
  'id' | 'createdAt' | 'updatedAt' | 'products'
>;
type CreateProductTemplateDto = Omit<DbProductTemplateUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateProductTemplateDto = Omit<DbProductTemplateUncheckedUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class TemplatesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async createCategoryTemplate(data: CreateCategoryTemplateDto) {
    return this._db.dbCategoryTemplate.create({
      data,
    });
  }

  public async updateCategoryTemplate(id: string, data: UpdateCategoryTemplateDto) {
    return this._db.dbCategoryTemplate.update({
      where: { id },
      data,
    });
  }

  public async deleteCategoryTemplate(id: string) {
    return this._db.dbCategoryTemplate.delete({
      where: { id },
    });
  }

  public async createProductTemplate(data: CreateProductTemplateDto) {
    return this._db.dbProductTemplate.create({
      data,
    });
  }

  public async updateProductTemplate(id: string, data: UpdateProductTemplateDto) {
    return this._db.dbProductTemplate.update({
      where: { id },
      data,
    });
  }

  public async deleteProductTemplate(id: string) {
    return this._db.dbProductTemplate.delete({
      where: { id },
    });
  }

  public async upsertCategoryTemplate(name: string, icon?: string | null) {
    const existing = await this._db.dbCategoryTemplate.findFirst({ where: { name } });
    if (existing) {
      if (existing.icon !== icon) {
        return this._db.dbCategoryTemplate.update({
          where: { id: existing.id },
          data: { icon },
        });
      }
      return existing;
    }
    return this._db.dbCategoryTemplate.create({
      data: { name, icon },
    });
  }

  public async upsertProductTemplate(name: string, price: number, categoryId: string, imageUrl?: string | null) {
    const existing = await this._db.dbProductTemplate.findFirst({ where: { name, categoryId } });
    if (existing) {
      if (existing.price !== price || existing.imageUrl !== imageUrl) {
        return this._db.dbProductTemplate.update({
          where: { id: existing.id },
          data: { price, imageUrl },
        });
      }
      return existing;
    }
    return this._db.dbProductTemplate.create({
      data: { name, price, categoryId, imageUrl },
    });
  }

  public async createManyCategories(
    data: { barId: string; name: string; icon: string | null }[],
    skipDuplicates = true,
  ) {
    return this._db.dbCategory.createMany({
      data,
      skipDuplicates,
    });
  }

  public async createManyProducts(
    data: {
      categoryId: string;
      name: string;
      price: number;
      currentStock: number;
      minStockAlert: number;
      imageUrl?: string | null;
    }[],
    skipDuplicates = true,
  ) {
    return this._db.dbProduct.createMany({
      data,
      skipDuplicates,
    });
  }
}
