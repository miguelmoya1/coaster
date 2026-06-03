import type { ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { CategoryTemplate, ProductTemplate } from '../../core';

export class TemplatesMapper {
  static toCategoryTemplate(categoryTemplate: CategoryTemplate): ICategoryTemplate {
    return {
      id: categoryTemplate.id,
      name: categoryTemplate.name,
      icon: categoryTemplate.icon || undefined,
      createdAt: categoryTemplate.createdAt,
      updatedAt: categoryTemplate.updatedAt,
    };
  }

  static toProductTemplate(productTemplate: ProductTemplate): IProductTemplate {
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
