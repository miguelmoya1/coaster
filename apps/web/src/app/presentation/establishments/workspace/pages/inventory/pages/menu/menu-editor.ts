import { Component, computed, effect, inject, input, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type {
  Category,
  EstablishmentId,
  Language,
  MenuDraft,
  MenuItemDraft,
  MenuSectionDraft,
  ProductId,
} from '@coaster/common';
import { LANGUAGE_NAMES, LANGUAGES } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { ManageMenu } from '@coaster/menu';
import type { Product } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageSelect } from '../../../../../../components/language-select/language-select';
import { ResourceStatus } from '../../../../../../components/resource-status/resource-status';
import { PageContainer } from '../../../../../../components/page-container/page-container';
import { PageHeader } from '../../../../../../components/page-header/page-header';
import { QrCode } from '../../../../../../components/qr-code/qr-code';
import { PricePipe } from '../../../../pipes/price/price';
import { CoasterInput } from '../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-menu-editor',
  imports: [
    MatIcon,
    MatButton,
    MatIconButton,
    LanguageSelect,
    TranslatePipe,
    ResourceStatus,
    PageContainer,
    PageHeader,
    PricePipe,
    QrCode,
    CoasterInput,
  ],
  host: { class: 'flex flex-col gap-2' },
  templateUrl: './menu-editor.html',
})
export default class MenuEditor {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly menu = input.required<PageResource<MenuDraft>>();
  public readonly products = input.required<PageResource<Product[]>>();
  public readonly categories = input.required<PageResource<Category[]>>();

  readonly #manageMenu = inject(ManageMenu);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  protected readonly languages = LANGUAGES;
  protected readonly isSaving = signal(false);
  protected readonly editingLanguage = signal<Language>('es');

  protected readonly sections = signal<MenuSectionDraft[]>([]);
  protected readonly menuName = signal('');
  protected readonly offered = signal<Language[]>(['es']);

  protected readonly draft = linkedSignal<MenuDraft | null>(() => {
    const menu = this.menu();
    return menu.hasValue() ? (menu.value() ?? null) : null;
  });
  protected readonly defaultLanguage = computed<Language>(() => this.draft()?.defaultLanguage ?? 'es');
  protected readonly slug = computed(() => this.draft()?.slug ?? '');
  protected readonly isPublished = computed(() => Boolean(this.draft()?.publishedAt));
  protected readonly hasUnpublishedChanges = computed(() => this.draft()?.hasUnpublishedChanges ?? false);
  protected readonly canPublish = computed(() => !this.isPublished() || this.hasUnpublishedChanges() || this.isDirty());

  protected readonly publicUrl = computed(() => `${location.origin}/m/${this.slug()}`);

  protected readonly qr = viewChild(QrCode);

  protected readonly extraLanguages = computed(() =>
    this.languages.filter((language) => language !== this.defaultLanguage()),
  );

  protected readonly productList = computed(() => loadedOr(this.products(), []));
  protected readonly categoryList = computed(() => loadedOr(this.categories(), []));

  protected readonly missingWording = computed(() =>
    this.offered().reduce((total, language) => {
      const sections = this.sections();
      const blanks =
        sections.filter((section) => !section.translations[language]?.name).length +
        sections.flatMap((section) => section.items).filter((item) => !this.itemName(item, language)).length;

      return total + blanks;
    }, 0),
  );

  readonly #savedShape = signal('');
  protected readonly isDirty = computed(() => this.shapeOf() !== this.#savedShape());

  constructor() {
    effect(() => {
      const draft = this.draft();

      untracked(() => {
        if (!draft) {
          return;
        }

        this.sections.set(structuredClone(draft.sections));
        this.menuName.set(draft.name);
        this.offered.set([...draft.languages]);
        this.editingLanguage.set(draft.defaultLanguage);
        this.#savedShape.set(this.shapeOf());
      });
    });
  }

  protected shapeOf(): string {
    return JSON.stringify({ name: this.menuName(), languages: this.offered(), sections: this.sections() });
  }

  protected languageName(language: Language): string {
    return LANGUAGE_NAMES[language];
  }

  protected itemPlaceholder(item: MenuItemDraft): string {
    return this.itemName(item, this.editingLanguage()) || this.#translate.instant('menu.item_name_placeholder');
  }

  protected priceOrigin(item: MenuItemDraft): string {
    return item.price === undefined ? 'menu.price_from_product' : 'menu.price_own';
  }

  protected itemName(item: MenuItemDraft, language: Language): string {
    const written = item.translations[language]?.name;

    if (written) {
      return written;
    }

    return language === this.defaultLanguage() ? this.productName(item.productId) : '';
  }

  protected productName(productId?: ProductId): string {
    return this.productList().find((product) => product.id === productId)?.name ?? '';
  }

  protected priceOf(item: MenuItemDraft): number {
    return item.price ?? this.productList().find((product) => product.id === item.productId)?.price ?? 0;
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

  protected readonly canFillFromCatalogue = computed(
    () => this.sections().length === 0 && this.productList().length > 0,
  );

  protected fillFromCatalogue() {
    const products = this.productList();

    this.sections.set(
      this.categoryList()
        .map((category) => ({
          translations: { [this.defaultLanguage()]: { name: category.name } } as MenuSectionDraft['translations'],
          items: products
            .filter((product) => product.categoryId === category.id)
            .map((product) => ({ productId: product.id, isVisible: true, translations: {} })),
        }))
        .filter((section) => section.items.length > 0),
    );
  }

  protected toggleItemVisible(sectionIndex: number, itemIndex: number) {
    this.sections.update((sections) =>
      sections.map((section, at) =>
        at === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, i) => (i === itemIndex ? { ...item, isVisible: !item.isVisible } : item)),
            }
          : section,
      ),
    );
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
          ? {
              ...section,
              items: [...section.items, { productId: productId as ProductId, isVisible: true, translations: {} }],
            }
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
      sections.map((section, at) =>
        at === sectionIndex ? { ...section, items: move(section.items, itemIndex, by) } : section,
      ),
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
      this.draft.set(
        await this.#manageMenu.save(establishmentId, {
          name: this.menuName(),
          languages: this.offered(),
          sections: this.sections(),
        }),
      );
      this.#savedShape.set(this.shapeOf());
      this.#feedback.success(this.#translate.instant('menu.saved'));
    });
  }

  protected async publish() {
    await this.run(async (establishmentId) => {
      this.draft.set(
        await this.#manageMenu.save(establishmentId, {
          name: this.menuName(),
          languages: this.offered(),
          sections: this.sections(),
        }),
      );
      this.#savedShape.set(this.shapeOf());
      await this.#manageMenu.publish(establishmentId);
      this.menu().reload();
      this.#feedback.success(this.#translate.instant('menu.published'));
    });
  }

  protected async unpublish() {
    await this.run(async (establishmentId) => {
      await this.#manageMenu.unpublish(establishmentId);
      this.menu().reload();
      this.#feedback.success(this.#translate.instant('menu.unpublished'));
    });
  }

  protected downloadQr() {
    const image = this.qr()?.toPngDataUrl();

    if (!image) {
      return;
    }

    const link = document.createElement('a');
    link.href = image;
    link.download = `qr-${this.slug()}.png`;
    link.click();
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
  const outOfRange = (at: number) => at < 0 || at >= items.length;

  if (outOfRange(index) || outOfRange(target)) {
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
