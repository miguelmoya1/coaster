import { asCategoryId, asProductId, Product } from '@coaster/interfaces';
import { checkIsProduct, productArrayMapper, productMapper } from './product.mapper';

describe('Product Mapper', () => {
  const validProduct: Product = {
    id: asProductId('1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Test Product',
    currentStock: 10,
    minStockAlert: 5,
    lastUpdated: new Date().toISOString(),
  };

  it('should validate correctly', () => {
    expect(checkIsProduct(validProduct)).toBe(true);
    expect(checkIsProduct({})).toBe(false);
    expect(checkIsProduct({ ...validProduct, name: undefined })).toBe(false);
    expect(checkIsProduct(null)).toBe(false);
  });

  it('should map product', () => {
    expect(productMapper(validProduct)).toEqual(validProduct);
  });

  it('should throw on invalid product', () => {
    expect(() => productMapper({})).toThrow('Invalid Product payload');
  });

  it('should map product array', () => {
    expect(productArrayMapper([validProduct])).toEqual([validProduct]);
  });

  it('should throw on invalid product array', () => {
    expect(() => productArrayMapper({})).toThrow('Expected array of Products');
  });
});
