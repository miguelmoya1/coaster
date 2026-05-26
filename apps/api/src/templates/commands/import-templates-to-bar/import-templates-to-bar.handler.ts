import { ErrorCodes } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { commonMapper } from '../../../core/mappers/common.mapper';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { ImportTemplatesToBarCommand } from './import-templates-to-bar.command';

@CommandHandler(ImportTemplatesToBarCommand)
export class ImportTemplatesToBarHandler implements ICommandHandler<ImportTemplatesToBarCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: ImportTemplatesToBarCommand): Promise<any> {
    const { categoryTemplateIds } = command.dto;

    if (!categoryTemplateIds || categoryTemplateIds.length === 0) {
      throw new BadRequestException(ErrorCodes.REQUIRED);
    }

    const categoryTemplates = await this._templatesRepository.findCategoryTemplatesByIds(categoryTemplateIds);

    if (categoryTemplates.length === 0) {
      throw new NotFoundException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const categoryNames = categoryTemplates.map((ct) => ct.name);
    const existingCategories = await this._templatesRepository.findCategoriesByBarIdAndNames(
      command.barId,
      categoryNames,
    );
    const existingCategoryNames = new Set(existingCategories.map((c) => c.name));

    const categoryDataToInsert = categoryTemplates
      .filter((ct) => !existingCategoryNames.has(ct.name))
      .map((ct) => ({
        barId: command.barId,
        name: ct.name,
        icon: ct.icon ?? null,
      }));

    if (categoryDataToInsert.length > 0) {
      await this._templatesRepository.createManyCategories(categoryDataToInsert, true);
    }

    const createdCategories = await this._templatesRepository.findCategoriesByBarIdAndNames(
      command.barId,
      categoryNames,
    );

    const categoryMap = new Map<string, string>();
    for (const cat of createdCategories) {
      categoryMap.set(cat.name, cat.id);
    }

    const categoryIds = createdCategories.map((cat) => cat.id);
    const existingProducts = await this._templatesRepository.findProductsByCategoryIds(categoryIds);
    const existingProductKeys = new Set(existingProducts.map((p) => `${p.categoryId}_${p.name}`));

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
          const productKey = `${realCategoryId}_${productTemplate.name}`;
          if (!existingProductKeys.has(productKey)) {
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
    }

    if (productsDataToInsert.length > 0) {
      await this._templatesRepository.createManyProducts(productsDataToInsert, true);
    }

    const created = categoryDataToInsert.length + productsDataToInsert.length;
    const modified = 0;

    return commonMapper.getSuccessResponse({ created, modified });
  }
}
