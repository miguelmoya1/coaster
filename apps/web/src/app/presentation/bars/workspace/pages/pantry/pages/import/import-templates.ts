import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BarId } from '@coaster/common';
import { Toast } from '@coaster/core';
import { CategoriesStore } from '@coaster/categories';
import { ProductsStore } from '@coaster/products';
import { TemplatesStore } from '@coaster/templates';
import { CoasterBtn, CoasterTitle, Loading, PricePipe } from '@coaster/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideSearch,
  lucideX,
  lucideFolder,
  lucidePackage,
  lucideCheck,
  lucideDownload,
} from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'coaster-import-templates',
  imports: [
    RouterLink,
    NgIcon,
    TranslatePipe,
    CoasterBtn,
    CoasterTitle,
    Loading,
    PricePipe,
    LowerCasePipe,
  ],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideSearch,
      lucideX,
      lucideFolder,
      lucidePackage,
      lucideCheck,
      lucideDownload,
    }),
  ],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './import-templates.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ImportTemplates {
  public readonly barId = input.required<BarId>();

  readonly #templatesStore = inject(TemplatesStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #productsStore = inject(ProductsStore);
  readonly #toast = inject(Toast);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);

  readonly searchQuery = signal<string>('');
  readonly selectedCategoryIds = signal<Set<string>>(new Set());
  readonly isSubmitting = signal(false);

  readonly categoriesLoading = computed(() => this.#templatesStore.categories.isLoading());
  readonly productsLoading = computed(() => this.#templatesStore.products.isLoading());
  readonly isLoading = computed(() => this.categoriesLoading() || this.productsLoading());

  readonly selectedCategoriesCount = computed(() => this.selectedCategoryIds().size);
  readonly selectedProductsCount = computed(() => {
    const selectedIds = this.selectedCategoryIds();
    const templates = this.matchedTemplates();
    let total = 0;
    for (const cat of templates) {
      if (selectedIds.has(cat.id)) {
        total += cat.products.length;
      }
    }
    return total;
  });


  // Join categories and products locally in the client reactively
  readonly matchedTemplates = computed(() => {
    const categories = this.#templatesStore.categories.value() ?? [];
    const products = this.#templatesStore.products.value() ?? [];

    return categories.map((cat) => ({
      ...cat,
      products: products.filter((p) => p.categoryId === cat.id),
    }));
  });

  // Local filtering based on query matching category or product name
  readonly filteredTemplates = computed(() => {
    const templates = this.matchedTemplates();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      return templates;
    }

    return templates
      .map((cat) => {
        const categoryMatches = cat.name.toLowerCase().includes(query);
        const matchedProducts = cat.products.filter((p) => p.name.toLowerCase().includes(query));

        if (categoryMatches) {
          return cat;
        } else if (matchedProducts.length > 0) {
          return {
            ...cat,
            products: matchedProducts,
          };
        }
        return null;
      })
      .filter((cat): cat is Exclude<typeof cat, null> => cat !== null);
  });

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  toggleCategory(id: string) {
    const current = new Set(this.selectedCategoryIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedCategoryIds.set(current);
  }

  selectAll() {
    const allIds = this.filteredTemplates().map((c) => c.id);
    this.selectedCategoryIds.set(new Set(allIds));
  }

  deselectAll() {
    this.selectedCategoryIds.set(new Set());
  }

  async importSelected() {
    const barId = this.barId();
    const ids = Array.from(this.selectedCategoryIds());
    if (ids.length === 0) return;

    this.isSubmitting.set(true);
    const { counts, err } = await this.#templatesStore.importToBar(barId, ids);
    this.isSubmitting.set(false);

    if (err) {
      this.#toast.error(this.#translate.instant('common.error'));
      return;
    }

    console.log('Import templates success. counts:', counts);
    const translationResult = this.#translate.instant('pantry.import_success', {
      created: counts?.created ?? 0,
      modified: counts?.modified ?? 0,
    });
    console.log('Translation result:', translationResult);

    this.#toast.success(translationResult);

    // Reload stores to refresh the lists in the pantry view
    this.#categoriesStore.reloadCategories();
    this.#productsStore.reloadProducts();

    // Navigate back to the pantry
    this.#router.navigate(['/bars', barId, 'pantry']);
  }
}
