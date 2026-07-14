import type { Product } from '@coaster/common';
import { asCategoryId, asProductId } from '../../core';
import { DbProduct as ProductDb } from '../../core/db';

export const ProductsMapper = {
  toDomain(dbProduct: ProductDb): Product {
    return {
      id: asProductId(dbProduct.id),
      categoryId: asCategoryId(dbProduct.categoryId),
      name: dbProduct.name,
      price: dbProduct.price,
      currentStock: dbProduct.currentStock,
      minStockAlert: dbProduct.minStockAlert,
      imageUrl: dbProduct.imageUrl ?? undefined,
      lastUpdated: dbProduct.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Product): Product {
    return domainEntity;
  },
};
