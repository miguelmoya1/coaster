import { asCategoryId, asProductId, Product, StockStatus } from '@coaster/interfaces';
import { Product as ProductDb } from '../../core';

const resolveStockStatus = (currentStock: number, minStockAlert: number): StockStatus => {
  if (currentStock <= 0) return 'critical';
  if (currentStock <= minStockAlert) return 'low';
  return 'good';
};

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
