import { LowerCasePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { CategoriesStore } from '@coaster/categories';
import type { EstablishmentId } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { ProductsStore } from '@coaster/products';
import { CatalogueStore } from '@coaster/catalogue';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Loading } from '../../../../../../components/loading/loading';
import { PageHeader } from '../../../../../../components/page-header/page-header';

import { PricePipe } from '../../../../pipes/price/price';
import { ButtonSpinner } from '../../../../../../components/button-spinner/button-spinner';

@Component({
  selector: 'coaster-import-catalogue',
  imports: [
    ButtonSpinner,
    MatIcon,
    TranslatePipe,
    MatButton,
    MatIconButton,
    Loading,
    PricePipe,
    LowerCasePipe,
    PageHeader,
  ],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './import-catalogue.html',
})
export default class ImportCatalogue {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #catalogueStore = inject(CatalogueStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #productsStore = inject(ProductsStore);
  readonly #feedback = inject(ActionFeedback);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);

  constructor() {
    effect(() => {
      this.#catalogueStore.setEstablishmentId(this.establishmentId());
    });
  }

  readonly searchQuery = signal<string>('');
  readonly selectedCategoryKeys = signal<Set<string>>(new Set());
  readonly isSubmitting = signal(false);

  readonly isLoading = computed(() => this.#catalogueStore.starter.isLoading());

  readonly selectedCategoriesCount = computed(() => this.selectedCategoryKeys().size);
  readonly selectedProductsCount = computed(() => {
    const selected = this.selectedCategoryKeys();

    return this.starterCategories()
      .filter((cat) => selected.has(cat.key))
      .reduce((total, cat) => total + cat.products.length, 0);
  });

  readonly starterCategories = computed(() => this.#catalogueStore.starter.value() ?? []);

  readonly filteredCategories = computed(() => {
    const categories = this.starterCategories();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      return categories;
    }

    return categories
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

  toggleCategory(key: string) {
    const current = new Set(this.selectedCategoryKeys());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedCategoryKeys.set(current);
  }

  selectAll() {
    this.selectedCategoryKeys.set(new Set(this.filteredCategories().map((c) => c.key)));
  }

  deselectAll() {
    this.selectedCategoryKeys.set(new Set());
  }

  async importSelected() {
    const establishmentId = this.establishmentId();
    const keys = Array.from(this.selectedCategoryKeys());
    if (keys.length === 0) return;

    this.isSubmitting.set(true);

    try {
      await this.#catalogueStore.import(establishmentId, keys);
      this.isSubmitting.set(false);

      const translationResult = this.#translate.instant('inventory.import_success');
      this.#feedback.success(translationResult);

      this.#categoriesStore.reloadCategories();
      this.#productsStore.reloadProducts();

      this.#router.navigate(['/establishments', establishmentId, 'inventory']);
    } catch (error) {
      this.#feedback.error(error);
      this.isSubmitting.set(false);
    }
  }
}
