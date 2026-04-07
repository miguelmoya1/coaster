import { Product } from '@coaster/interfaces';

export const checkIsProduct = (product: unknown): product is Product => {
  return (
    typeof product === 'object' &&
    product !== null &&
    typeof (product as any).id === 'string' &&
    typeof (product as any).categoryId === 'string' &&
    typeof (product as any).name === 'string' &&
    typeof (product as any).currentStock === 'number' &&
    typeof (product as any).minStockAlert === 'number'
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
