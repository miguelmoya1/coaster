import { Category } from '@coaster/interfaces';

export const checkIsCategory = (category: unknown): category is Category => {
  return (
    typeof category === 'object' &&
    category !== null &&
    'id' in category &&
    'name' in category
  );
};

export const categoryMapper = (category: unknown): Category => {
  if (!checkIsCategory(category)) {
    throw new Error('Invalid Category payload');
  }
  return { ...category };
};

export const categoryArrayMapper = (categories: unknown): Category[] => {
  if (!Array.isArray(categories)) throw new Error('Expected array of Categories');
  return categories.map(categoryMapper);
};
