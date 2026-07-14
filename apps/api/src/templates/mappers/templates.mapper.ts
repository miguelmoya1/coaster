import type { ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { DbCategoryTemplate, DbProductTemplate } from '../../core/db';

export class TemplatesMapper {
  static toCategoryTemplate(categoryTemplate: DbCategoryTemplate): ICategoryTemplate {
    return {
      id: categoryTemplate.id,
      name: categoryTemplate.name,
      icon: categoryTemplate.icon || undefined,
      createdAt: Temporal.Instant.fromEpochMilliseconds(categoryTemplate.createdAt.getTime()).toString(),
      updatedAt: Temporal.Instant.fromEpochMilliseconds(categoryTemplate.updatedAt.getTime()).toString(),
    };
  }

  static toProductTemplate(productTemplate: DbProductTemplate): IProductTemplate {
    return {
      id: productTemplate.id,
      name: productTemplate.name,
      price: productTemplate.price,
      categoryId: productTemplate.categoryId,
      imageUrl: productTemplate.imageUrl ?? undefined,
      createdAt: Temporal.Instant.fromEpochMilliseconds(productTemplate.createdAt.getTime()).toString(),
      updatedAt: Temporal.Instant.fromEpochMilliseconds(productTemplate.updatedAt.getTime()).toString(),
    };
  }
}
