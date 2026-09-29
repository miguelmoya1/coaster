export const Allergen = {
  GLUTEN: 'GLUTEN',
  CRUSTACEANS: 'CRUSTACEANS',
  EGGS: 'EGGS',
  FISH: 'FISH',
  PEANUTS: 'PEANUTS',
  SOYBEANS: 'SOYBEANS',
  MILK: 'MILK',
  NUTS: 'NUTS',
  CELERY: 'CELERY',
  MUSTARD: 'MUSTARD',
  SESAME: 'SESAME',
  SULPHITES: 'SULPHITES',
  LUPIN: 'LUPIN',
  MOLLUSCS: 'MOLLUSCS',
} as const;

export type Allergen = (typeof Allergen)[keyof typeof Allergen];

export const ALLERGENS: Allergen[] = Object.values(Allergen);
