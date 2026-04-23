import { asCategoryId, asProductId, Product } from '@coaster/interfaces';
import { resolveStockStatus } from '@coaster/logic';
import { Product as ProductDb } from '../../core';

export const ProductsMapper = {
  toDomain(dbProduct: ProductDb): Product {
    return {
      id: asProductId(dbProduct.id),
      categoryId: asCategoryId(dbProduct.categoryId),
      name: dbProduct.name,
      currentStock: dbProduct.currentStock,
      minStockAlert: dbProduct.minStockAlert,
      stockStatus: resolveStockStatus(dbProduct.currentStock, dbProduct.minStockAlert),
      lastUpdated: dbProduct.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Product): Product {
    return domainEntity;
  },
};
