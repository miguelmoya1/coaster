import { asProductStatus, Product } from '@coaster/interfaces';

export const checkIsProduct = (product: unknown): product is Product => {
  return (
    typeof product === 'object' &&
    product !== null &&
    typeof (product as any).id === 'string' &&
    typeof (product as any).categoryId === 'string' &&
    typeof (product as any).name === 'string' &&
    typeof (product as any).status === 'string'
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
