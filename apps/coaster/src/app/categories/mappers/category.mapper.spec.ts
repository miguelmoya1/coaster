import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { categoryArrayMapper, categoryMapper, checkIsCategory } from './category.mapper';

describe('Category Mapper', () => {
  const validCategory: Category = {
    id: asCategoryId('1'),
    barId: asBarId('bar-1'),
    name: 'Test Category',
  };

  it('should validate correctly', () => {
    expect(checkIsCategory(validCategory)).toBe(true);
    expect(checkIsCategory({})).toBe(false);
    expect(checkIsCategory(null)).toBe(false);
  });

  it('should map category', () => {
    expect(categoryMapper(validCategory)).toEqual(validCategory);
  });

  it('should throw on invalid category', () => {
    expect(() => categoryMapper({})).toThrow('Invalid Category payload');
  });

  it('should map category array', () => {
    expect(categoryArrayMapper([validCategory])).toEqual([validCategory]);
  });

  it('should throw on invalid category array', () => {
    expect(() => categoryArrayMapper({})).toThrow('Expected array of Categories');
  });
});
