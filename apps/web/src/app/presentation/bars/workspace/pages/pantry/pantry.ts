import { Component, computed, effect, inject, input, inputBinding, outputBinding, signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatChipListbox, MatChipListboxChange, MatChipOption, MatChipTrailingIcon } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { CategoriesStore } from '@coaster/categories';
import type { BarId, Category } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../../components/confirm-dialog/confirm-dialog.component';
import { Loading } from '../../../../components/loading/loading';
import { Fab } from '../../components/fab/fab';
import { InventoryItemCard } from '../../components/inventory-item-card/inventory-item-card';
import { CreatePantrySheet } from './components/create-pantry-sheet/create-pantry-sheet';
import { EditCategoryForm } from './components/edit-category-form/edit-category-form';
import { PantrySearch } from './components/pantry-search/pantry-search';
import { UpdateProductForm } from './components/update-product-form/update-product-form';
import { UpdateStockProductForm } from './components/update-stock-product-form/update-stock-product-form';

@Component({
  selector: 'coaster-pantry',
  imports: [
    MatChipListbox,
    MatChipOption,
    MatChipTrailingIcon,
    InventoryItemCard,
    Loading,
    RouterLink,
    TranslatePipe,
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatIcon,
    MatButton,
    PantrySearch,
    Fab,
  ],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './pantry.html',
  styles: `
    .product {
      content-visibility: auto;
      contain-intrinsic-size: 100px;
    }
  `,
})
export default class Pantry {
  public readonly barId = input.required<BarId>();

  readonly #barsStore = inject(BarsStore);

  protected readonly canImportTemplates = computed(() =>
    this.#barsStore.hasPermission(BarPermission.BAR_IMPORT_TEMPLATES),
  );
  protected readonly canUpdateCategory = computed(() =>
    this.#barsStore.hasPermission(BarPermission.BAR_UPDATE_CATEGORY),
  );
  protected readonly canUpdateProduct = computed(() => this.#barsStore.hasPermission(BarPermission.BAR_UPDATE_PRODUCT));
  protected readonly canCreateProduct = computed(() => this.#barsStore.hasPermission(BarPermission.BAR_CREATE_PRODUCT));

  readonly #productsStore = inject(ProductsStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #translate = inject(TranslateService);

  readonly #dialog = inject(MatDialog);
  readonly #bottomSheet = inject(MatBottomSheet);

  readonly isSubmitting = signal(false);
  readonly selectedCategoryId = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly productDeleting = signal<Product | null>(null);
  readonly categoryDeleting = signal<Category | null>(null);

  readonly categories = this.#categoriesStore.list;
  readonly products = this.#productsStore.list;
  readonly totalProductsCount = this.#productsStore.total;
  readonly criticalProductsCount = this.#productsStore.criticalStock;
  readonly alertProductsCount = this.#productsStore.lowStock;

  readonly tabs = computed(() => {
    const rawCategories = this.categories.value() ?? [];
    return [
      { id: 'ALL', label: this.#translate.instant('pantry.all') },
      ...rawCategories.map((c) => ({ id: c.id, label: c.name })),
    ];
  });

  readonly filteredProducts = computed(() => {
    if (!this.products.hasValue()) {
      return [];
    }

    let allProducts = this.products.value();
    const categoryId = this.selectedCategoryId();

    if (categoryId !== 'ALL') {
      allProducts = allProducts.filter((p) => p.categoryId === categoryId);
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      allProducts = allProducts.filter((p) => p.name.toLowerCase().includes(query));
    }

    return [...allProducts].sort((a, b) => {
      const nameA = this.#translate.instant(a.name) || a.name;
      const nameB = this.#translate.instant(b.name) || b.name;
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#categoriesStore.setBarId(barId);
      this.#productsStore.setBarId(barId);
    });
  }

  onCreatePantryClicked() {
    const bottomSheetRef = this.#bottomSheet.open(CreatePantrySheet, {
      disableClose: true,
      bindings: [
        inputBinding('categories', () => this.categories.value() ?? []),
        outputBinding('canceled', () => {
          bottomSheetRef.dismiss();
        }),
        outputBinding('created', () => {
          bottomSheetRef.dismiss();
        }),
      ],
    });
  }

  onCategoryChange(event: MatChipListboxChange, listbox: MatChipListbox) {
    const value = event.value;
    if (value === undefined || value === null) {
      listbox.value = this.selectedCategoryId();
    } else {
      this.selectedCategoryId.set(value);
    }
  }

  onProductClicked(product: Product) {
    const bottomSheetRef = this.#bottomSheet.open(UpdateStockProductForm, {
      bindings: [
        inputBinding('product', () => product),
        outputBinding('updated', () => {
          bottomSheetRef.dismiss();
        }),
        outputBinding('canceled', () => {
          bottomSheetRef.dismiss();
        }),
      ],
    });
  }

  onEditProductClicked(product: Product) {
    const bottomSheetRef = this.#bottomSheet.open(UpdateProductForm, {
      bindings: [
        inputBinding('product', () => product),
        inputBinding('categories', () => this.categories.value() ?? []),
        outputBinding('edited', () => {
          bottomSheetRef.dismiss();
        }),
        outputBinding('canceled', () => {
          bottomSheetRef.dismiss();
        }),
      ],
    });
  }

  onEditCategoryClicked(event?: Event, categoryId?: string) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const targetId = categoryId || this.selectedCategoryId();
    if (targetId === 'ALL') return;
    const cat = this.categories.value()?.find((c) => c.id === targetId);
    if (cat) {
      const bottomSheetRef = this.#bottomSheet.open(EditCategoryForm, {
        bindings: [
          inputBinding('category', () => cat),
          outputBinding('updated', () => {
            bottomSheetRef.dismiss();
          }),
          outputBinding('canceled', () => {
            bottomSheetRef.dismiss();
          }),
          outputBinding('deleted', () => {
            bottomSheetRef.dismiss();
            this.handleDeleteCategoryClicked(cat);
          }),
        ],
      });
    }
  }

  protected handleDeleteProductClicked(product: Product) {
    this.productDeleting.set(product);
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => true),
        inputBinding('title', () => this.#translate.instant('pantry.delete_product.title')),
        inputBinding('text', () => this.#translate.instant('pantry.delete_product.message', { name: product.name })),
        outputBinding('canceled', () => {
          this.handleCancelDeleteProduct();
          dialogRef.close();
        }),
        outputBinding('deleted', () => {
          this.handleConfirmDeleteProduct();
          dialogRef.close();
        }),
      ],
    });
  }

  protected handleCancelDeleteProduct() {
    this.productDeleting.set(null);
  }

  protected async handleConfirmDeleteProduct() {
    const productToDelete = this.productDeleting();
    if (!productToDelete) {
      return;
    }

    this.productDeleting.set(null);

    try {
      await this.#productsStore.delete(productToDelete.id);
    } catch (error) {
      console.error(error);
    }
  }

  protected handleDeleteCategoryClicked(category: Category) {
    this.categoryDeleting.set(category);
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => true),
        inputBinding('title', () => this.#translate.instant('pantry.delete_category.title')),
        inputBinding('text', () => this.#translate.instant('pantry.delete_category.message', { name: category.name })),
        outputBinding('canceled', () => {
          this.handleCancelDeleteCategory();
          dialogRef.close();
        }),
        outputBinding('deleted', () => {
          this.handleConfirmDeleteCategory();
          dialogRef.close();
        }),
      ],
    });
  }

  protected handleCancelDeleteCategory() {
    this.categoryDeleting.set(null);
  }

  protected async handleConfirmDeleteCategory() {
    const categoryToDelete = this.categoryDeleting();
    if (!categoryToDelete) {
      return;
    }

    this.categoryDeleting.set(null);
    this.selectedCategoryId.set('ALL');
    try {
      await this.#categoriesStore.delete(categoryToDelete.id);
    } catch (error) {
      console.error(error);
    }
  }
}
