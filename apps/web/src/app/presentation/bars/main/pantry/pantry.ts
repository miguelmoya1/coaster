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
import { BarId, Category, Product } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoriesStore } from '../../../../categories';
import { CurrentUser } from '../../../../core';
import { MembersStore } from '../../../../members';

import { ProductsStore } from '../../../../products';
import {
  BottomSheet,
  CoasterBtn,
  CoasterTitle,
  ConfirmDialogComponent,
  Fab,
  Loading,
  StatusCard,
  Tabs,
} from '../../../../shared';
import { CreateCategoryForm } from './components/create-category-form/create-category-form';
import { CreateProductForm } from './components/create-product-form/create-product-form';
import { EditCategoryForm } from './components/edit-category-form/edit-category-form';
import { InventoryItemCard } from './components/inventory-item-card/inventory-item-card';
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
  ],
  viewProviders: [provideIcons({ lucidePencil })],
  host: {
    class: 'flex flex-col gap-2 h-full',
  },
  templateUrl: './pantry.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Pantry {
  public readonly barId = input.required<BarId>();

  readonly #productsStore = inject(ProductsStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #currentUser = inject(CurrentUser);
  readonly #translate = inject(TranslateService);
  readonly #membersStore = inject(MembersStore);

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

  readonly currentUserRole = computed(() => {
    const barMember = this.#membersStore.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    return barMember?.role;
  });

  readonly tabs = computed(() => {
    const rawCategories = this.categories.value() ?? [];
    return [
      { id: 'ALL', label: this.#translate.instant('pantry.all') },
      ...rawCategories.map((c) => ({ id: c.id, label: c.name })),
    ];
  });

  readonly filteredProducts = computed(() => {
    if (!this.products.hasValue()) return [];

    const allProducts = this.products.value();
    const categoryId = this.selectedCategoryId();

    return categoryId === 'ALL' ? allProducts : allProducts.filter((p) => p.categoryId === categoryId);
  });

  constructor() {
    effect(() => {
      this.#categoriesStore.setBarId(this.barId());
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
