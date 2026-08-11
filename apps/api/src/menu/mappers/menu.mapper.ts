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
      translations: unknown;
      product: { name: string; price: number; imageUrl: string | null; allergens: string[]; deletedAt: Date | null } | null;
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
      hasUnpublishedChanges: !menu.publishedAt || menu.updatedAt > menu.publishedAt,
      sections: menu.sections.map((section) => ({
        translations: wording(section.translations),
        items: section.items.map((item) => ({
          productId: (item.productId ?? undefined) as ProductId | undefined,
          price: item.price ?? undefined,
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
