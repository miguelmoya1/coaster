import type { ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { DbCategoryTemplate, DbProductTemplate } from '../../db';;

export class TemplatesMapper {
  static toCategoryTemplate(categoryTemplate: DbCategoryTemplate): ICategoryTemplate {
    return {
      id: categoryTemplate.id,
      name: categoryTemplate.name,
      icon: categoryTemplate.icon || undefined,
      createdAt: categoryTemplate.createdAt,
      updatedAt: categoryTemplate.updatedAt,
    };
  }

  static toProductTemplate(productTemplate: DbProductTemplate): IProductTemplate {
    return {
      id: productTemplate.id,
      name: productTemplate.name,
      price: productTemplate.price,
      categoryId: productTemplate.categoryId,
      createdAt: productTemplate.createdAt,
      updatedAt: productTemplate.updatedAt,
    };
  }
}
