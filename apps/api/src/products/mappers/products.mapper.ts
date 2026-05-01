import { asCategoryId, asProductId, Product, resolveStockStatus } from '@coaster/common';
import { Product as ProductDb } from '../../core';

export const ProductsMapper = {
  toDomain(dbProduct: ProductDb): Product {
    return {
      id: asProductId(dbProduct.id),
      categoryId: asCategoryId(dbProduct.categoryId),
      name: dbProduct.name,
      price: dbProduct.price,
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
