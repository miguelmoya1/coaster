import type { Allergen, Product } from '@coaster/common';
import { asCategoryId, asProductId, resolveTaxRate } from '@coaster/common';
import { DbProduct as ProductDb } from '@coaster/core/db';

export const ProductsMapper = {
  toDomain(dbProduct: ProductDb & { category?: { taxRate: number } }): Product {
    return {
      id: asProductId(dbProduct.id),
      categoryId: asCategoryId(dbProduct.categoryId),
      name: dbProduct.name,
      price: dbProduct.price,
      currentStock: dbProduct.currentStock,
      minStockAlert: dbProduct.minStockAlert,
      imageUrl: dbProduct.imageUrl ?? undefined,
      icon: dbProduct.icon ?? undefined,
      taxRate: resolveTaxRate(dbProduct.taxRate, dbProduct.category?.taxRate),
      ownTaxRate: dbProduct.taxRate ?? undefined,
      allergens: (dbProduct.allergens ?? []) as Allergen[],
      lastUpdated: dbProduct.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Product): Product {
    return domainEntity;
  },
};
