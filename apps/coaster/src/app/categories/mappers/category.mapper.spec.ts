import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { categoryArrayMapper, categoryMapper, checkIsCategory } from './category.mapper';

describe('Category Mapper', () => {
  const validCategory: Category = {
    id: asCategoryId('cat-1'),
    barId: asBarId('bar-1'),
    name: 'Tapas',
  };

  describe('checkIsCategory', () => {
    it('should return true for valid category', () => {
      expect(checkIsCategory({ id: 'cat-1', name: 'Category' })).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsCategory(null)).toBe(false);
      expect(checkIsCategory({ name: 'Category' })).toBe(false);
      expect(checkIsCategory({ id: '1' })).toBe(false);
    });
  });

  describe('categoryMapper', () => {
    it('should map a valid category', () => {
      expect(categoryMapper(validCategory)).toEqual(validCategory);
    });

    it('should throw Error for invalid category', () => {
      expect(() => categoryMapper({})).toThrow(Error);
      expect(() => categoryMapper(null)).toThrow(Error);
      expect(() => categoryMapper(undefined)).toThrow(Error);
      expect(() => categoryMapper({ id: '1' })).toThrow(Error);
      expect(() => categoryMapper({ name: 'Category' })).toThrow(Error);
    });
  });

  describe('categoryArrayMapper', () => {
    it('should map an array of valid categories', () => {
      expect(categoryArrayMapper([validCategory])).toEqual([validCategory]);
    });

    it('should throw for non-array input', () => {
      expect(() => categoryArrayMapper({})).toThrow(Error);
      expect(() => categoryArrayMapper(null)).toThrow(Error);
      expect(() => categoryArrayMapper(undefined)).toThrow(Error);
      expect(() => categoryArrayMapper(1)).toThrow(Error);
      expect(() => categoryArrayMapper('1')).toThrow(Error);
    });
  });
});
