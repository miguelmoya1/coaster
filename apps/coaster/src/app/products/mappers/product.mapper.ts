import { asProductStatus, Product } from '@coaster/interfaces';

export const checkIsProduct = (product: unknown): product is Product => {
  return (
    typeof product === 'object' &&
    product !== null &&
    'id' in product &&
    'categoryId' in product &&
    'name' in product &&
    'status' in product
  );
};

export const productMapper = (product: unknown): Product => {
  if (!checkIsProduct(product)) {
    throw new Error('Invalid Product payload');
  }
  return { ...product, status: asProductStatus(product.status as string) };
};

export const productArrayMapper = (products: unknown): Product[] => {
  if (!Array.isArray(products)) throw new Error('Expected array of Products');
  return products.map(productMapper);
};
