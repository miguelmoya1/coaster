import type {
  Allergen,
  Language,
  MenuTranslations,
  PublishedMenu,
  PublishedMenuItem,
  PublishedMenuSection,
} from '@coaster/common';

export interface RenderableItem {
  price: number | null;
  translations: MenuTranslations;
  product: { name: string; price: number; imageUrl: string | null; allergens: Allergen[] } | null;
}

export interface RenderableSection {
  translations: MenuTranslations;
  items: RenderableItem[];
}

export interface RenderableMenu {
  name: string;
  defaultLanguage: Language;
  languages: Language[];
  sections: RenderableSection[];
}

/**
 * A missing wording falls back to the menu's own language and no further: a customer reading a
 * third language they did not ask for is worse off than one reading the original.
 */
const wordingFor = (translations: MenuTranslations, language: Language, fallback: Language) =>
  translations[language] ?? translations[fallback];

const itemFor = (item: RenderableItem, language: Language, fallback: Language): PublishedMenuItem | null => {
  const wording = wordingFor(item.translations, language, fallback);
  const name = wording?.name?.trim() || item.product?.name;

  if (!name) {
    return null;
  }

  return {
    name,
    description: wording?.description?.trim() || undefined,
    price: item.price ?? item.product?.price ?? 0,
    imageUrl: item.product?.imageUrl ?? undefined,
    allergens: item.product?.allergens ?? [],
  };
};

const sectionFor = (
  section: RenderableSection,
  language: Language,
  fallback: Language,
): PublishedMenuSection | null => {
  const name = wordingFor(section.translations, language, fallback)?.name?.trim();
  const items = section.items
    .map((item) => itemFor(item, language, fallback))
    .filter((item): item is PublishedMenuItem => item !== null);

  if (!name || items.length === 0) {
    return null;
  }

  return { name, items };
};

/** An empty section is left out rather than printed as a heading with nothing under it. */
export const renderMenu = (menu: RenderableMenu, language: Language): PublishedMenu => ({
  name: menu.name,
  language,
  languages: menu.languages,
  sections: menu.sections
    .map((section) => sectionFor(section, language, menu.defaultLanguage))
    .filter((section): section is PublishedMenuSection => section !== null),
});

export const renderEveryLanguage = (menu: RenderableMenu): Record<string, PublishedMenu> =>
  Object.fromEntries(menu.languages.map((language) => [language, renderMenu(menu, language)]));
