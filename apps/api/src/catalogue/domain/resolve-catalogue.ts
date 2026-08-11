import type { Language, StarterCatalogueCategory } from '@coaster/common';
import { DEFAULT_LANGUAGE } from '@coaster/common';
import type { StarterCategory } from '../starter-catalogue';
import { STARTER_CATALOGUE } from '../starter-catalogue';

const wordFor = (names: Record<Language, string>, language: Language): string =>
  names[language] || names[DEFAULT_LANGUAGE];

const resolveCategory = (category: StarterCategory, language: Language): StarterCatalogueCategory => ({
  key: category.key,
  name: wordFor(category.names, language),
  icon: category.icon ?? undefined,
  products: category.products.map((product) => ({
    name: wordFor(product.names, language),
    price: product.price,
  })),
});

export const resolveCatalogue = (language: Language): StarterCatalogueCategory[] =>
  STARTER_CATALOGUE.map((category) => resolveCategory(category, language));

export const resolveCategories = (keys: string[] | undefined, language: Language): StarterCatalogueCategory[] => {
  if (!keys || keys.length === 0) {
    return resolveCatalogue(language);
  }

  const wanted = new Set(keys);

  return STARTER_CATALOGUE.filter((category) => wanted.has(category.key)).map((category) =>
    resolveCategory(category, language),
  );
};
