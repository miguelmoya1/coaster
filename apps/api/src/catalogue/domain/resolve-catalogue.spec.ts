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
