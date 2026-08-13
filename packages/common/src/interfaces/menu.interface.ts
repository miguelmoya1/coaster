import { Allergen } from '../constants/allergen.type';
import { Language } from '../constants/language.type';
import { Brand } from './brand.type';
import { ProductId } from './product.interface';

export type MenuId = Brand<string, 'MenuId'>;

export interface MenuWording {
  name?: string;
  description?: string;
}

export type MenuTranslations = Partial<Record<Language, MenuWording>>;

export interface MenuItemDraft {
  productId?: ProductId;
  price?: number;
  isVisible: boolean;
  translations: MenuTranslations;
}

export interface MenuSectionDraft {
  translations: MenuTranslations;
  items: MenuItemDraft[];
}

export interface MenuDraft {
  id: MenuId;
  slug: string;
  name: string;
  defaultLanguage: Language;
  languages: Language[];
  publishedAt?: string;
  hasUnpublishedChanges: boolean;
  sections: MenuSectionDraft[];
}

export interface SaveMenuDraftDto {
  name: string;
  languages: Language[];
  sections: MenuSectionDraft[];
}

export interface PublishedMenuItem {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  allergens: Allergen[];
  productId?: ProductId;
  soldOut?: boolean;
}

export interface PublishedMenuSection {
  name: string;
  items: PublishedMenuItem[];
}

export interface PublishedMenu {
  name: string;
  language: Language;
  languages: Language[];
  sections: PublishedMenuSection[];
}
