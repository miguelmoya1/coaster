import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/services/prisma.service';
import { CreateCategoryTemplateDto } from '../dto/create-category-template.dto';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { UpdateCategoryTemplateDto } from '../dto/update-category-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';

@Injectable()
export class TemplatesRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async findAllCategoryTemplates() {
    return this._prisma.categoryTemplate.findMany({
      include: {
        products: true,
      },
    });
  }

  async findCategoryTemplateById(id: string) {
    return this._prisma.categoryTemplate.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });
  }

  async createCategoryTemplate(data: CreateCategoryTemplateDto) {
    return this._prisma.categoryTemplate.create({
      data,
    });
  }

  async updateCategoryTemplate(id: string, data: UpdateCategoryTemplateDto) {
    return this._prisma.categoryTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteCategoryTemplate(id: string) {
    return this._prisma.categoryTemplate.delete({
      where: { id },
    });
  }

  async findAllProductTemplates() {
    return this._prisma.productTemplate.findMany({
      include: {
        category: true,
      },
    });
  }

  async findProductTemplateById(id: string) {
    return this._prisma.productTemplate.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async createProductTemplate(data: CreateProductTemplateDto) {
    return this._prisma.productTemplate.create({
      data,
    });
  }

  async updateProductTemplate(id: string, data: UpdateProductTemplateDto) {
    return this._prisma.productTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteProductTemplate(id: string) {
    return this._prisma.productTemplate.delete({
      where: { id },
    });
  }

  async findCategoryTemplateByName(name: string) {
    return this._prisma.categoryTemplate.findFirst({
      where: { name },
    });
  }

  async upsertCategoryTemplate(name: string, icon?: string | null) {
    const existing = await this.findCategoryTemplateByName(name);
    if (existing) {
      if (existing.icon !== icon) {
        return this._prisma.categoryTemplate.update({
          where: { id: existing.id },
          data: { icon },
        });
      }
      return existing;
    }
    return this._prisma.categoryTemplate.create({
      data: { name, icon },
    });
  }

  async findProductTemplateByNameAndCategoryId(name: string, categoryId: string) {
    return this._prisma.productTemplate.findFirst({
      where: { name, categoryId },
    });
  }

  async upsertProductTemplate(name: string, price: number, categoryId: string) {
    const existing = await this.findProductTemplateByNameAndCategoryId(name, categoryId);
    if (existing) {
      if (existing.price !== price) {
        return this._prisma.productTemplate.update({
          where: { id: existing.id },
          data: { price },
        });
      }
      return existing;
    }
    return this._prisma.productTemplate.create({
      data: { name, price, categoryId },
    });
  }

  async findCategoryTemplatesByIds(ids: string[]) {
    return this._prisma.categoryTemplate.findMany({
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

  async createManyCategories(data: { barId: string; name: string; icon: string | null }[], skipDuplicates = true) {
    return this._prisma.category.createMany({
      data,
      skipDuplicates,
    });
  }

  async findCategoriesByBarIdAndNames(barId: string, names: string[]) {
    return this._prisma.category.findMany({
      where: {
        barId,
        name: {
          in: names,
        },
      },
    });
  }

  async findProductsByCategoryIds(categoryIds: string[]) {
    return this._prisma.product.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
    });
  }

  async createManyProducts(
    data: { categoryId: string; name: string; price: number; currentStock: number; minStockAlert: number }[],
    skipDuplicates = true,
  ) {
    return this._prisma.product.createMany({
      data,
      skipDuplicates,
    });
  }
}
