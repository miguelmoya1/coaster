import { asCategoryId, asProductId } from '@coaster/core';
import { Product } from '@coaster/products';
import { describe, expect, it } from 'vitest';
import { checkIsProduct, productArrayMapper, productMapper } from './product.mapper';

describe('Product Mapper', () => {
  const lastUpdated = new Date().toISOString();

  const validProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    price: 1050,
    currentStock: 10,
    minStockAlert: 5,
    stockStatus: 'GOOD',
    lastUpdated,
  };

  const productWithoutStockStatus = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    price: 1050,
    currentStock: 10,
    minStockAlert: 5,
    lastUpdated,
  };

  describe('checkIsProduct', () => {
    it('should return true for valid product with stockStatus', () => {
      expect(checkIsProduct(validProduct)).toBe(true);
    });

    it('should return true for valid product without stockStatus', () => {
      expect(checkIsProduct(productWithoutStockStatus)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsProduct(null)).toBe(false);
      expect(checkIsProduct({})).toBe(false);
      expect(checkIsProduct({ id: '1' })).toBe(false);
    });
  });

  describe('productMapper', () => {
    it('should map a valid product and calculate GOOD stock status', () => {
      const mapped = productMapper(productWithoutStockStatus);
      expect(mapped).toEqual(validProduct);
      expect(mapped.stockStatus).toBe('GOOD');
    });

    it('should map and calculate WARNING stock status', () => {
      const lowStockProduct = {
        ...productWithoutStockStatus,
        currentStock: 4,
      };
      const mapped = productMapper(lowStockProduct);
      expect(mapped.stockStatus).toBe('WARNING');
    });

    it('should map and calculate ALERT stock status', () => {
      const criticalStockProduct = {
        ...productWithoutStockStatus,
        currentStock: 0,
      };
      const mapped = productMapper(criticalStockProduct);
      expect(mapped.stockStatus).toBe('ALERT');
    });

    it('should throw Error for invalid product', () => {
      expect(() => productMapper({})).toThrow('Invalid Product payload');
    });
  });

  describe('productArrayMapper', () => {
    it('should map valid array of products without stockStatus', () => {
      expect(productArrayMapper([productWithoutStockStatus])).toEqual([validProduct]);
    });

    it('should return empty array for empty input', () => {
      expect(productArrayMapper([])).toEqual([]);
    });

    it('should throw Error if input is not an array', () => {
      expect(() => productArrayMapper({})).toThrow('Expected array of Products');
    });
  });
});
