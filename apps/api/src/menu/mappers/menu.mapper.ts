import type { Allergen, MenuDraft, MenuId, MenuTranslations, ProductId } from '@coaster/common';
import { asLanguage } from '@coaster/common';
import type { RenderableMenu } from '../domain/render-menu';

type DbMenuWithSections = {
  id: string;
  slug: string;
  name: string;
  defaultLanguage: string;
  languages: string[];
  publishedAt: Date | null;
  updatedAt: Date;
  sections: {
    translations: unknown;
    items: {
      productId: string | null;
      price: number | null;
      isVisible: boolean;
      translations: unknown;
      product: {
        name: string;
        price: number;
        imageUrl: string | null;
        allergens: string[];
        deletedAt: Date | null;
        updatedAt: Date;
      } | null;
    }[];
  }[];
};

const wording = (translations: unknown): MenuTranslations => (translations ?? {}) as MenuTranslations;

export const MenuMapper = {
  toDraft(menu: DbMenuWithSections): MenuDraft {
    return {
      id: menu.id as MenuId,
      slug: menu.slug,
      name: menu.name,
      defaultLanguage: asLanguage(menu.defaultLanguage),
      languages: menu.languages.map(asLanguage),
      publishedAt: menu.publishedAt?.toISOString(),
      hasUnpublishedChanges: hasChangesSince(menu),
      sections: menu.sections.map((section) => ({
        translations: wording(section.translations),
        items: section.items.map((item) => ({
          productId: (item.productId ?? undefined) as ProductId | undefined,
          price: item.price ?? undefined,
          isVisible: item.isVisible,
          translations: wording(item.translations),
        })),
      })),
    };
  },

  /** A deleted product is treated as gone: the line keeps its own wording and price. */
  toRenderable(menu: DbMenuWithSections): RenderableMenu {
    return {
      name: menu.name,
      defaultLanguage: asLanguage(menu.defaultLanguage),
      languages: menu.languages.map(asLanguage),
      sections: menu.sections.map((section) => ({
        translations: wording(section.translations),
        items: section.items.map((item) => ({
          price: item.price,
          isVisible: item.isVisible,
          productId: item.productId,
          translations: wording(item.translations),
          product:
            item.product && !item.product.deletedAt
              ? {
                  name: item.product.name,
                  price: item.product.price,
                  imageUrl: item.product.imageUrl,
                  allergens: item.product.allergens as Allergen[],
                }
              : null,
        })),
      })),
    };
  },
};

/**
 * A published menu also goes stale when a product it points at moves: an allergen added or a price
 * corrected changes what customers should be reading, and only republishing puts it in front of them.
 */
const hasChangesSince = (menu: DbMenuWithSections): boolean => {
  const published = menu.publishedAt;

  if (!published) {
    return true;
  }

  if (menu.updatedAt > published) {
    return true;
  }

  return menu.sections.some((section) =>
    section.items.some((item) => item.product && item.product.updatedAt > published),
  );
};
