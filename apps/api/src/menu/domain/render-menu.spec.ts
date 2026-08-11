import { describe, expect, it } from 'vitest';
import type { RenderableMenu } from './render-menu';
import { renderEveryLanguage, renderMenu } from './render-menu';

const menu = (overrides: Partial<RenderableMenu> = {}): RenderableMenu => ({
  name: 'Carta',
  defaultLanguage: 'es',
  languages: ['es', 'en'],
  sections: [
    {
      translations: { es: { name: 'Cafetería' }, en: { name: 'Coffee' } },
      items: [
        {
          price: null,
          translations: { es: { name: 'Café Solo', description: 'Recién molido' }, en: { name: 'Black Coffee' } },
          product: { name: 'Café Solo', price: 120, imageUrl: null, allergens: [] },
        },
      ],
    },
  ],
  ...overrides,
});

describe('renderMenu', () => {
  it('should render the language asked for', () => {
    const rendered = renderMenu(menu(), 'en');

    expect(rendered.sections[0].name).toBe('Coffee');
    expect(rendered.sections[0].items[0].name).toBe('Black Coffee');
  });

  it('should fall back to the menu language, never to a third one', () => {
    const rendered = renderMenu(
      menu({
        defaultLanguage: 'es',
        sections: [
          {
            translations: { es: { name: 'Postres' } },
            items: [{ price: 400, translations: { es: { name: 'Flan' } }, product: null }],
          },
        ],
      }),
      'en',
    );

    expect(rendered.sections[0].name).toBe('Postres');
    expect(rendered.sections[0].items[0].name).toBe('Flan');
  });

  it('should take the item price when it has one and the product price otherwise', () => {
    const withOverride = menu();
    withOverride.sections[0].items[0].price = 180;

    expect(renderMenu(withOverride, 'es').sections[0].items[0].price).toBe(180);
    expect(renderMenu(menu(), 'es').sections[0].items[0].price).toBe(120);
  });

  it('should keep a line whose product was deleted, since it carries its own wording and price', () => {
    const orphan = menu();
    orphan.sections[0].items[0].product = null;
    orphan.sections[0].items[0].price = 150;

    const rendered = renderMenu(orphan, 'es');

    expect(rendered.sections[0].items[0].name).toBe('Café Solo');
    expect(rendered.sections[0].items[0].price).toBe(150);
  });

  it('should drop a line with nothing left to call it', () => {
    const nameless = menu();
    nameless.sections[0].items[0].product = null;
    nameless.sections[0].items[0].translations = {};

    expect(renderMenu(nameless, 'es').sections).toEqual([]);
  });

  it('should leave out a section with no items rather than print an empty heading', () => {
    const empty = menu({ sections: [{ translations: { es: { name: 'Vacía' } }, items: [] }] });

    expect(renderMenu(empty, 'es').sections).toEqual([]);
  });

  it('should carry the allergens and the image from the product', () => {
    const withDetail = menu();
    withDetail.sections[0].items[0].product = {
      name: 'Croquetas',
      price: 600,
      imageUrl: 'https://example.test/c.jpg',
      allergens: ['GLUTEN', 'MILK'],
    };

    const item = renderMenu(withDetail, 'es').sections[0].items[0];

    expect(item.allergens).toEqual(['GLUTEN', 'MILK']);
    expect(item.imageUrl).toBe('https://example.test/c.jpg');
  });

  it('should drop a description that is only whitespace', () => {
    const blank = menu();
    blank.sections[0].items[0].translations = { es: { name: 'Café Solo', description: '   ' } };

    expect(renderMenu(blank, 'es').sections[0].items[0].description).toBeUndefined();
  });
});

describe('renderEveryLanguage', () => {
  it('should render one menu per language the menu offers', () => {
    const rendered = renderEveryLanguage(menu());

    expect(Object.keys(rendered)).toEqual(['es', 'en']);
    expect(rendered.es.sections[0].name).toBe('Cafetería');
    expect(rendered.en.sections[0].name).toBe('Coffee');
  });
});
