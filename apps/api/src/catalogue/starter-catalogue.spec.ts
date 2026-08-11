import { LANGUAGES } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import { STARTER_CATALOGUE } from './starter-catalogue';

describe('STARTER_CATALOGUE', () => {
  const products = STARTER_CATALOGUE.flatMap((category) => category.products);

  it('should name every category and product in every language the app offers', () => {
    const unnamed = [...STARTER_CATALOGUE, ...products].filter((entry) =>
      LANGUAGES.some((language) => !entry.names[language]?.trim()),
    );

    expect(unnamed).toEqual([]);
  });

  it('should never carry a translation key where a word belongs', () => {
    const keys = [...STARTER_CATALOGUE, ...products].flatMap((entry) =>
      Object.values(entry.names).filter((name) => name.startsWith('templates.')),
    );

    expect(keys).toEqual([]);
  });

  it('should identify each category once, since the import asks for them by key', () => {
    const keys = STARTER_CATALOGUE.map((category) => category.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should price everything in whole cents above zero', () => {
    const wrong = products.filter((product) => !Number.isInteger(product.price) || product.price <= 0);

    expect(wrong).toEqual([]);
  });

  it('should leave no category empty, because importing one would do nothing', () => {
    expect(STARTER_CATALOGUE.filter((category) => category.products.length === 0)).toEqual([]);
  });
});
