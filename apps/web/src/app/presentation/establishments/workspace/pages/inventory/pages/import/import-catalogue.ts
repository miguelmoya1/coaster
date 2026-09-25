import { LowerCasePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ImportStarterCatalogue } from '@coaster/catalogue';
import type { EstablishmentId, StarterCatalogueCategory } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ResourceStatus } from '../../../../../../components/resource-status/resource-status';
import { PageHeader } from '../../../../../../components/page-header/page-header';

import { PricePipe } from '../../../../pipes/price/price';
import { Spinner } from '../../../../../../components/spinner/spinner';
import { CoasterInput } from '../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-import-catalogue',
  imports: [
    Spinner,
    MatIcon,
    TranslatePipe,
    MatButton,
    MatIconButton,
    ResourceStatus,
    PricePipe,
    LowerCasePipe,
    PageHeader,
    CoasterInput,
  ],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './import-catalogue.html',
})
export default class ImportCatalogue {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly starter = input.required<PageResource<StarterCatalogueCategory[]>>();

  readonly #importStarterCatalogue = inject(ImportStarterCatalogue);
  readonly #feedback = inject(ActionFeedback);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);

  readonly searchQuery = signal<string>('');
  readonly selectedCategoryKeys = signal<Set<string>>(new Set());
  readonly isSubmitting = signal(false);

  readonly selectedCategoriesCount = computed(() => this.selectedCategoryKeys().size);
  readonly selectedProductsCount = computed(() => {
    const selected = this.selectedCategoryKeys();

    return this.starterCategories()
      .filter((cat) => selected.has(cat.key))
      .reduce((total, cat) => total + cat.products.length, 0);
  });

  readonly starterCategories = computed(() => loadedOr(this.starter(), []));

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
      await this.#importStarterCatalogue.execute(establishmentId, keys);
      this.isSubmitting.set(false);

      const translationResult = this.#translate.instant('inventory.import_success');
      this.#feedback.success(translationResult);

      this.#router.navigate(['/establishments', establishmentId, 'inventory']);
    } catch (error) {
      this.#feedback.error(error);
      this.isSubmitting.set(false);
    }
  }
}
