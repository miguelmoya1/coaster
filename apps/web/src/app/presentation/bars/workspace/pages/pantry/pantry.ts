import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { CategoriesStore } from '@coaster/categories';
import { BarId, BarPermission, Category, Product } from '@coaster/common';
import { ProductsStore } from '@coaster/products';
import {
  BottomSheet,
  CoasterBtn,
  CoasterTitle,
  ConfirmDialogComponent,
  Fab,
  Loading,
  StatusCard,
  Tabs,
} from '@coaster/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucidePencil, lucideSearch, lucideX } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    Tabs,
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
    StatusCard,
    CoasterTitle,
    NgIcon,
    CoasterBtn,
    ConfirmDialogComponent,
    PantrySearch,
  ],
  viewProviders: [provideIcons({ lucidePencil, lucideSearch, lucideX, lucideDownload })],
  host: {
    class: 'flex flex-col gap-2 h-full',
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

    return allProducts;
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

  onEditCategoryClicked() {
    const categoryId = this.selectedCategoryId();
    if (categoryId === 'ALL') return;
    const cat = this.categories.value()?.find((c) => c.id === categoryId);
    if (cat) {
      this.categoryToEdit.set(cat);
    }
  }

  protected handleDeleteProductClicked(product: Product) {
    this.productDeleting.set(product);
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
