import { Product as CommonProduct } from '@coaster/common';
import { Product, calculateStockStatus } from '../models/product.interface';

export const checkIsProduct = (product: unknown): product is CommonProduct => {
  const p = product as Record<string, unknown>;
  return (
    typeof product === 'object' &&
    product !== null &&
    typeof p['id'] === 'string' &&
    typeof p['categoryId'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['currentStock'] === 'number' &&
    typeof p['minStockAlert'] === 'number'
  );
};

export const productMapper = (product: unknown): Product => {
  if (!checkIsProduct(product)) {
    throw new Error('Invalid Product payload');
  }
  return {
    ...product,
    stockStatus: calculateStockStatus(product.currentStock, product.minStockAlert),
  } as Product;
};

export const productArrayMapper = (products: unknown): Product[] => {
  if (!Array.isArray(products)) throw new Error('Expected array of Products');
  return products.map(productMapper);
};
