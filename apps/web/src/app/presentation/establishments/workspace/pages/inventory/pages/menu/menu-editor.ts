import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { EstablishmentId, Language, MenuItemDraft, MenuSectionDraft, ProductId } from '@coaster/common';
import { LANGUAGES } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { MenuStore } from '@coaster/menu';
import { ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Loading } from '../../../../../../components/loading/loading';
import { PricePipe } from '../../../../pipes/price/price';

@Component({
  selector: 'coaster-menu-editor',
  imports: [RouterLink, MatIcon, MatButton, MatIconButton, TranslatePipe, Loading, PricePipe],
  host: { class: 'flex flex-col gap-2' },
  templateUrl: './menu-editor.html',
})
export default class MenuEditor {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #menuStore = inject(MenuStore);
  readonly #productsStore = inject(ProductsStore);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  protected readonly languages = LANGUAGES;
  protected readonly isSaving = signal(false);
  protected readonly editingLanguage = signal<Language>('es');

  protected readonly sections = signal<MenuSectionDraft[]>([]);
  protected readonly menuName = signal('');
  protected readonly offered = signal<Language[]>(['es']);

  protected readonly isLoading = computed(() => this.#menuStore.draft.isLoading());
  protected readonly draft = computed(() => (this.#menuStore.draft.hasValue() ? this.#menuStore.draft.value() : null));
  protected readonly defaultLanguage = computed<Language>(() => this.draft()?.defaultLanguage ?? 'es');
  protected readonly slug = computed(() => this.draft()?.slug ?? '');
  protected readonly isPublished = computed(() => Boolean(this.draft()?.publishedAt));
  protected readonly hasUnpublishedChanges = computed(() => this.draft()?.hasUnpublishedChanges ?? false);
  protected readonly publicUrl = computed(() => `${location.origin}/m/${this.slug()}`);

  protected readonly products = computed(() => (this.#productsStore.list.hasValue() ? this.#productsStore.list.value() : []));

  /** What the owner still has to write before the menu reads properly in every language offered. */
  protected readonly missingWording = computed(() =>
    this.offered().reduce((total, language) => {
      const sections = this.sections();
      const blanks =
        sections.filter((section) => !section.translations[language]?.name).length +
        sections.flatMap((section) => section.items).filter((item) => !this.itemName(item, language)).length;

      return total + blanks;
    }, 0),
  );

  constructor() {
    effect(() => {
      const establishmentId = this.establishmentId();
      this.#menuStore.setEstablishmentId(establishmentId);
      this.#productsStore.setEstablishmentId(establishmentId);
    });

    effect(() => {
      const draft = this.draft();

      if (draft) {
        this.sections.set(structuredClone(draft.sections));
        this.menuName.set(draft.name);
        this.offered.set([...draft.languages]);
        this.editingLanguage.set(draft.defaultLanguage);
      }
    });
  }

  protected itemName(item: MenuItemDraft, language: Language): string {
    const written = item.translations[language]?.name;

    if (written) {
      return written;
    }

    return language === this.defaultLanguage() ? this.productName(item.productId) : '';
  }

  protected productName(productId?: ProductId): string {
    return this.products().find((product) => product.id === productId)?.name ?? '';
  }

  protected priceOf(item: MenuItemDraft): number {
    return item.price ?? this.products().find((product) => product.id === item.productId)?.price ?? 0;
  }

  protected isOffered(language: Language): boolean {
    return this.offered().includes(language);
  }

  protected toggleLanguage(language: Language) {
    if (language === this.defaultLanguage()) {
      this.#feedback.error(this.#translate.instant('MENU_LANGUAGE_NOT_OFFERED'));
      return;
    }

    this.offered.update((languages) =>
      languages.includes(language) ? languages.filter((offered) => offered !== language) : [...languages, language],
    );

    if (!this.isOffered(this.editingLanguage())) {
      this.editingLanguage.set(this.defaultLanguage());
    }
  }

  protected addSection() {
    this.sections.update((sections) => [...sections, { translations: {}, items: [] }]);
  }

  protected removeSection(index: number) {
    this.sections.update((sections) => sections.filter((_, at) => at !== index));
  }

  protected moveSection(index: number, by: number) {
    this.sections.update((sections) => move(sections, index, by));
  }

  protected setSectionName(index: number, name: string) {
    this.sections.update((sections) =>
      sections.map((section, at) => (at === index ? withWording(section, this.editingLanguage(), { name }) : section)),
    );
  }

  protected addItem(sectionIndex: number, productId: string) {
    if (!productId) {
      return;
    }

    this.sections.update((sections) =>
      sections.map((section, at) =>
        at === sectionIndex
          ? { ...section, items: [...section.items, { productId: productId as ProductId, translations: {} }] }
          : section,
      ),
    );
  }

  protected removeItem(sectionIndex: number, itemIndex: number) {
    this.sections.update((sections) =>
      sections.map((section, at) =>
        at === sectionIndex ? { ...section, items: section.items.filter((_, i) => i !== itemIndex) } : section,
      ),
    );
  }

  protected moveItem(sectionIndex: number, itemIndex: number, by: number) {
    this.sections.update((sections) =>
      sections.map((section, at) => (at === sectionIndex ? { ...section, items: move(section.items, itemIndex, by) } : section)),
    );
  }

  protected setItemWording(sectionIndex: number, itemIndex: number, field: 'name' | 'description', value: string) {
    this.sections.update((sections) =>
      sections.map((section, at) =>
        at === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, i) =>
                i === itemIndex ? withWording(item, this.editingLanguage(), { [field]: value }) : item,
              ),
            }
          : section,
      ),
    );
  }

  protected setItemPrice(sectionIndex: number, itemIndex: number, value: string) {
    const price = value.trim() === '' ? undefined : Math.max(0, Math.round(Number(value)));

    this.sections.update((sections) =>
      sections.map((section, at) =>
        at === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, i) =>
                i === itemIndex ? { ...item, price: Number.isFinite(price) ? price : undefined } : item,
              ),
            }
          : section,
      ),
    );
  }

  protected async save() {
    await this.run(async (establishmentId) => {
      await this.#menuStore.save(establishmentId, {
        name: this.menuName(),
        languages: this.offered(),
        sections: this.sections(),
      });
      this.#feedback.success(this.#translate.instant('menu.saved'));
    });
  }

  protected async publish() {
    await this.run(async (establishmentId) => {
      await this.#menuStore.save(establishmentId, {
        name: this.menuName(),
        languages: this.offered(),
        sections: this.sections(),
      });
      await this.#menuStore.publish(establishmentId);
      this.#feedback.success(this.#translate.instant('menu.published'));
    });
  }

  protected async unpublish() {
    await this.run(async (establishmentId) => {
      await this.#menuStore.unpublish(establishmentId);
      this.#feedback.success(this.#translate.instant('menu.unpublished'));
    });
  }

  protected async copyLink() {
    await navigator.clipboard.writeText(this.publicUrl());
    this.#feedback.success(this.#translate.instant('menu.link_copied'));
  }

  private async run(action: (establishmentId: EstablishmentId) => Promise<void>) {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      await action(this.establishmentId());
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }
}

const move = <T>(items: T[], index: number, by: number): T[] => {
  const target = index + by;

  if (target < 0 || target >= items.length) {
    return items;
  }

  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  return reordered;
};

const withWording = <T extends { translations: MenuSectionDraft['translations'] }>(
  entry: T,
  language: Language,
  wording: Record<string, string>,
): T => ({
  ...entry,
  translations: { ...entry.translations, [language]: { ...entry.translations[language], ...wording } },
});
