import { asCategoryId, asProductId, Product } from '@coaster/interfaces';
import { checkIsProduct, productArrayMapper, productMapper } from './product.mapper';

describe('Product Mapper', () => {
  const validProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    currentStock: 10,
    minStockAlert: 5,
    lastUpdated: new Date().toISOString(),
  };

  describe('checkIsProduct', () => {
    it('should return true for valid product', () => {
      expect(checkIsProduct(validProduct)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsProduct(null)).toBe(false);
      expect(checkIsProduct({})).toBe(false);
      expect(checkIsProduct({ id: '1' })).toBe(false);
    });
  });

  describe('productMapper', () => {
    it('should map a valid product', () => {
      expect(productMapper(validProduct)).toEqual(validProduct);
    });

    it('should throw Error for invalid product', () => {
      expect(() => productMapper({})).toThrow('Invalid Product payload');
    });
  });

  describe('productArrayMapper', () => {
    it('should map valid array of products', () => {
      expect(productArrayMapper([validProduct])).toEqual([validProduct]);
    });

    it('should return empty array for empty input', () => {
      expect(productArrayMapper([])).toEqual([]);
    });

    it('should throw Error if input is not an array', () => {
      expect(() => productArrayMapper({})).toThrow('Expected array of Products');
    });
  });
});
