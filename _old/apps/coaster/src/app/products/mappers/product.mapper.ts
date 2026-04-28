import { Product } from '@coaster/common';

export const checkIsProduct = (product: unknown): product is Product => {
  const p = product as Record<string, unknown>;
  return (
    typeof product === 'object' &&
    product !== null &&
    typeof p['id'] === 'string' &&
    typeof p['categoryId'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['currentStock'] === 'number' &&
    typeof p['minStockAlert'] === 'number' &&
    typeof p['stockStatus'] === 'string'
  );
};

export const productMapper = (product: unknown): Product => {
  if (!checkIsProduct(product)) {
    throw new Error('Invalid Product payload');
  }
  return product;
};

export const productArrayMapper = (products: unknown): Product[] => {
  if (!Array.isArray(products)) throw new Error('Expected array of Products');
  return products.map(productMapper);
};
