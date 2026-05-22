import { ErrorCodes } from '@coaster/common';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { commonMapper } from '../../core/mappers/common.mapper';
import { TemplatesRepository } from '../data-access/templates.repository';
import { CreateCategoryTemplateDto } from '../dto/create-category-template.dto';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { ImportTemplatesDto } from '../dto/import-templates.dto';
import { UpdateCategoryTemplateDto } from '../dto/update-category-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';
import { TemplatesMapper } from '../mappers/templates.mapper';

export interface BulkCategoryTemplateInput {
  name: string;
  icon?: string;
  products?: {
    name: string;
    price: number;
  }[];
}

@Injectable()
export class TemplatesService {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async findAllCategoryTemplates() {
    const templates = await this._templatesRepository.findAllCategoryTemplates();
    return templates.map((template) => TemplatesMapper.toCategoryTemplate(template));
  }

  async createCategoryTemplate(data: CreateCategoryTemplateDto) {
    const template = await this._templatesRepository.createCategoryTemplate(data);
    return TemplatesMapper.toCategoryTemplate(template);
  }

  async updateCategoryTemplate(id: string, data: UpdateCategoryTemplateDto) {
    const template = await this._templatesRepository.updateCategoryTemplate(id, data);
    return TemplatesMapper.toCategoryTemplate(template);
  }

  async deleteCategoryTemplate(id: string) {
    await this._templatesRepository.deleteCategoryTemplate(id);
    return commonMapper.getSuccessResponse();
  }

  async findAllProductTemplates() {
    const templates = await this._templatesRepository.findAllProductTemplates();
    return templates.map((template) => TemplatesMapper.toProductTemplate(template));
  }


  async createProductTemplate(data: CreateProductTemplateDto) {
    const template = await this._templatesRepository.createProductTemplate(data);
    return TemplatesMapper.toProductTemplate(template);
  }

  async updateProductTemplate(id: string, data: UpdateProductTemplateDto) {
    const template = await this._templatesRepository.updateProductTemplate(id, data);
    return TemplatesMapper.toProductTemplate(template);
  }

  async deleteProductTemplate(id: string) {
    await this._templatesRepository.deleteProductTemplate(id);
    return commonMapper.getSuccessResponse();
  }

  async importTemplatesToBar(barId: string, importDto: ImportTemplatesDto) {
    const { categoryTemplateIds } = importDto;

    if (!categoryTemplateIds || categoryTemplateIds.length === 0) {
      throw new BadRequestException(ErrorCodes.REQUIRED);
    }

    const categoryTemplates = await this._templatesRepository.findCategoryTemplatesByIds(categoryTemplateIds);

    if (categoryTemplates.length === 0) {
      throw new NotFoundException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const categoryDataToInsert = categoryTemplates.map((ct) => ({
      barId,
      name: ct.name,
      icon: ct.icon ?? null,
    }));

    await this._templatesRepository.createManyCategories(categoryDataToInsert, true);

    const categoryNames = categoryTemplates.map((ct) => ct.name);
    const createdCategories = await this._templatesRepository.findCategoriesByBarIdAndNames(barId, categoryNames);

    const categoryMap = new Map<string, string>();
    for (const cat of createdCategories) {
      categoryMap.set(cat.name, cat.id);
    }

    const productsDataToInsert: {
      categoryId: string;
      name: string;
      price: number;
      currentStock: number;
      minStockAlert: number;
    }[] = [];

    for (const categoryTemplate of categoryTemplates) {
      const realCategoryId = categoryMap.get(categoryTemplate.name);

      if (realCategoryId && categoryTemplate.products) {
        for (const productTemplate of categoryTemplate.products) {
          productsDataToInsert.push({
            categoryId: realCategoryId,
            name: productTemplate.name,
            price: productTemplate.price,
            currentStock: 0,
            minStockAlert: 0,
          });
        }
      }
    }

    if (productsDataToInsert.length > 0) {
      await this._templatesRepository.createManyProducts(productsDataToInsert, true);
    }

    return commonMapper.getSuccessResponse();
  }

  async bulkUpsertTemplates(categoriesJson: BulkCategoryTemplateInput[]) {
    for (const categoryJson of categoriesJson) {
      const categorySlug = this._slugify(categoryJson.name);
      const categoryNameKey = `templates.categories.${categorySlug}`;
      const categoryIcon = categoryJson.icon ?? null;

      const categoryTemplate = await this._templatesRepository.upsertCategoryTemplate(
        categoryNameKey,
        categoryIcon,
      );

      if (categoryJson.products && Array.isArray(categoryJson.products)) {
        for (const productJson of categoryJson.products) {
          const productSlug = this._slugify(productJson.name);
          const productNameKey = `templates.products.${productSlug}`;
          const productPrice = productJson.price ?? 0;

          await this._templatesRepository.upsertProductTemplate(
            productNameKey,
            productPrice,
            categoryTemplate.id,
          );
        }
      }
    }

    return commonMapper.getSuccessResponse();
  }

  private _slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
