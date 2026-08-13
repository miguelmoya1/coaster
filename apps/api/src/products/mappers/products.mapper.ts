import type { Allergen, Product } from '@coaster/common';
import { asCategoryId, asProductId } from '@coaster/common';
import { DbProduct as ProductDb } from '@coaster/core/db';

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
      allergens: (dbProduct.allergens ?? []) as Allergen[],
      lastUpdated: dbProduct.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Product): Product {
    return domainEntity;
  },
};
