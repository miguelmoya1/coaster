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

@Injectable()
export class TemplatesService {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  // Category Templates
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

  // Product Templates
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

  // Bulk Import
  async importTemplatesToBar(barId: string, importDto: ImportTemplatesDto) {
    const { categoryTemplateIds } = importDto;

    if (!categoryTemplateIds || categoryTemplateIds.length === 0) {
      throw new BadRequestException(ErrorCodes.REQUIRED);
    }

    // Paso 1: Buscar la info de los templates solicitados
    const categoryTemplates = await this._templatesRepository.findCategoryTemplatesByIds(categoryTemplateIds);

    if (categoryTemplates.length === 0) {
      throw new NotFoundException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    // Paso 2: Bulk Create (createMany) de las categorías con skipDuplicates: true
    const categoryDataToInsert = categoryTemplates.map((ct) => ({
      barId,
      name: ct.name,
      icon: ct.icon!,
    }));

    await this._templatesRepository.createManyCategories(categoryDataToInsert, true);

    // Paso 3: Bulk Read (findMany) de esas categorías para conseguir sus IDs reales
    const categoryNames = categoryTemplates.map((ct) => ct.name);
    const createdCategories = await this._templatesRepository.findCategoriesByBarIdAndNames(barId, categoryNames);

    // Crear un mapa para buscar rápidamente el nuevo categoryId por nombre
    const categoryMap = new Map<string, string>();
    for (const cat of createdCategories) {
      categoryMap.set(cat.name, cat.id);
    }

    // Paso 4: Bulk Create (createMany) de los productos usando los IDs mapeados
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
}
