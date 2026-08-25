import { describe, expect, it } from 'vitest';
import { STARTER_CATALOGUE } from '../starter-catalogue';
import { resolveCatalogue, resolveCategories } from './resolve-catalogue';

describe('resolveCatalogue', () => {
  it('should hand back one word per name, never the pair', () => {
    const [first] = resolveCatalogue('es');

    expect(first.name).toBe('Cafetería');
    expect(first.products[0].name).toBe('Café Solo');
  });

  it('should answer in the language asked for', () => {
    const [first] = resolveCatalogue('en');

    expect(first.name).toBe('Coffee Shop');
    expect(first.products[0].name).toBe('Black Coffee');
  });

  it('should keep every category and product', () => {
    const resolved = resolveCatalogue('en');

    expect(resolved).toHaveLength(STARTER_CATALOGUE.length);
    expect(resolved.flatMap((category) => category.products)).toHaveLength(
      STARTER_CATALOGUE.flatMap((category) => category.products).length,
    );
  });
});

describe('tax resolution', () => {
  it('should carry the rate the category declares', () => {
    const beers = resolveCatalogue('es').find((category) => category.key === 'cervezas');

    expect(beers?.taxRate).toBe(1000);
  });

  it('should leave a product rate unset when it just follows its category', () => {
    const products = resolveCatalogue('es').flatMap((category) => category.products);

    expect(products.every((product) => product.taxRate === undefined)).toBe(true);
  });

  it('should give every category a rate, since a product with none falls back to it', () => {
    const rateless = resolveCatalogue('es').filter((category) => typeof category.taxRate !== 'number');

    expect(rateless).toEqual([]);
  });
});

describe('resolveCategories', () => {
  it('should return only what was asked for', () => {
    const resolved = resolveCategories(['cafeteria'], 'es');

    expect(resolved.map((category) => category.key)).toEqual(['cafeteria']);
  });

  it('should ignore a key the catalogue does not have rather than inventing a category', () => {
    const resolved = resolveCategories(['cafeteria', 'sushi'], 'es');

    expect(resolved.map((category) => category.key)).toEqual(['cafeteria']);
  });

  it('should read no selection as the whole catalogue', () => {
    expect(resolveCategories([], 'es')).toEqual(resolveCatalogue('es'));
    expect(resolveCategories(undefined, 'es')).toEqual(resolveCatalogue('es'));
  });
});
