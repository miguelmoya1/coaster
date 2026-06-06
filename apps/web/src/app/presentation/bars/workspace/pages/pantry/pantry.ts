import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { CategoriesStore } from '@coaster/categories';
import type { BarId, Category } from '@coaster/common';
import { BarPermission } from '@coaster/core';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Loading } from '../../../../components/loading/loading';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { BottomSheet } from '../../components/bottom-sheet/bottom-sheet';
import { Fab } from '../../components/fab/fab';
import { InventoryItemCard } from '../../components/inventory-item-card/inventory-item-card';
import { CreateCategoryForm } from './components/create-category-form/create-category-form';
import { CreateProductForm } from './components/create-product-form/create-product-form';
import { EditCategoryForm } from './components/edit-category-form/edit-category-form';
import { PantrySearch } from './components/pantry-search/pantry-search';
import { UpdateProductForm } from './components/update-product-form/update-product-form';
import { UpdateStockProductForm } from './components/update-stock-product-form/update-stock-product-form';

type PantryTabs = 'PRODUCT' | 'CATEGORY';

@Component({
  selector: 'coaster-pantry',
  imports: [
    MatChipsModule,
    InventoryItemCard,
    CreateCategoryForm,
    CreateProductForm,
    Loading,
    BottomSheet,
    Fab,
    RouterLink,
    TranslatePipe,
    UpdateProductForm,
    UpdateStockProductForm,
    EditCategoryForm,
    MatCard,
    MatCardContent,
    MatIcon,
    MatButton,
    MatDialogModule,
    PantrySearch,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Pantry {
  public readonly barId = input.required<BarId>();

  readonly #barsStore = inject(BarsStore);

  protected readonly canImportTemplates = computed(() => this.#barsStore.hasPermission(BarPermission.IMPORT_TEMPLATES));
  protected readonly canUpdateCategory = computed(() => this.#barsStore.hasPermission(BarPermission.UPDATE_CATEGORY));
  protected readonly canUpdateProduct = computed(() => this.#barsStore.hasPermission(BarPermission.UPDATE_PRODUCT));
  protected readonly canCreateProduct = computed(() => this.#barsStore.hasPermission(BarPermission.CREATE_PRODUCT));

  readonly #productsStore = inject(ProductsStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #translate = inject(TranslateService);

  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #dialog = inject(MatDialog);

  protected readonly deleteProductDialogRef = viewChild.required<TemplateRef<unknown>>('deleteProductDialog');
  protected readonly deleteCategoryDialogRef = viewChild.required<TemplateRef<unknown>>('deleteCategoryDialog');

  readonly isCreateMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['new']),
    this.#router,
  );

  readonly currentTab = signal<PantryTabs>('PRODUCT');
  readonly availableTabs = signal<{ id: PantryTabs; label: string }[]>([
    { id: 'PRODUCT', label: this.#translate.instant('pantry.product') },
    { id: 'CATEGORY', label: this.#translate.instant('pantry.category') },
  ]);
  readonly isSubmitting = signal(false);
  readonly selectedCategoryId = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly productSelected = signal<Product | null>(null);
  readonly productToEdit = signal<Product | null>(null);
  readonly categoryToEdit = signal<Category | null>(null);
  readonly productDeleting = signal<Product | null>(null);
  readonly categoryDeleting = signal<Category | null>(null);

  readonly categories = this.#categoriesStore.list;
  readonly products = this.#productsStore.list;
  readonly totalProductsCount = this.#productsStore.total;
  readonly criticalProductsCount = this.#productsStore.criticalStock;
  readonly alertProductsCount = this.#productsStore.lowStock;

  readonly isModalOpen = linkedSignal(() => {
    return this.productSelected() || this.productToEdit() || this.categoryToEdit() || this.isCreateMode();
  });

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

  onProductClicked(product: Product) {
    this.productSelected.set(product);
  }

  onEditProductClicked(product: Product) {
    this.productToEdit.set(product);
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
      this.categoryToEdit.set(cat);
    }
  }

  protected handleDeleteProductClicked(product: Product) {
    this.productDeleting.set(product);
    const dialogRef = this.#dialog.open(this.deleteProductDialogRef());
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.handleConfirmDeleteProduct();
      } else {
        this.handleCancelDeleteProduct();
      }
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

    await this.#productsStore.delete(productToDelete.id);
  }

  protected handleDeleteCategoryClicked(category: Category) {
    this.categoryDeleting.set(category);
    const dialogRef = this.#dialog.open(this.deleteCategoryDialogRef());
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.handleConfirmDeleteCategory();
      } else {
        this.handleCancelDeleteCategory();
      }
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
    await this.#categoriesStore.delete(categoryToDelete.id);
  }

  closeModal() {
    this.productSelected.set(null);
    this.productToEdit.set(null);
    this.categoryToEdit.set(null);
    this.isSubmitting.set(false);
    this.isModalOpen.set(false);

    this.currentTab.set('PRODUCT');

    if (this.isCreateMode()) {
      this.#router.navigate(['/bars', this.barId(), 'pantry']);
    }
  }
}
