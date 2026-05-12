import { Dialog } from '@angular/cdk/dialog';
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
import { BarId, Category, CreateProductDto, Product, UpdateProductDto, UpdateProductStockDto } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoriesStore } from '../../../../categories';
import { CurrentUser, handleErrorFormField } from '../../../../core';
import { BarMembers } from '../../../../members';
import {
  BarProducts,
  CreateProduct,
  CreateProductForm,
  DeleteProduct,
  EditProduct,
  EditProductForm,
  InventoryItemCard,
  UpdateProduct,
  UpdateProductForm,
} from '../../../../products';
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
import { EditCategoryForm } from './components/edit-category-form/edit-category-form';

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
    EditProductForm,
    EditCategoryForm,
    StatusCard,
    CoasterTitle,
    NgIcon,
    CoasterBtn,
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

  readonly #productsService = inject(BarProducts);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #createProduct = inject(CreateProduct);
  readonly #currentUser = inject(CurrentUser);
  readonly #translate = inject(TranslateService);
  readonly #barMembers = inject(BarMembers);
  readonly #editProduct = inject(EditProduct);
  readonly #updateProductStock = inject(UpdateProduct);
  readonly #deleteProduct = inject(DeleteProduct);
  readonly #dialog = inject(Dialog);

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

  readonly categories = this.#categoriesStore.list;
  readonly products = this.#productsService.all;
  readonly totalProductsCount = this.#productsService.total;
  readonly criticalProductsCount = this.#productsService.criticalStock;
  readonly alertProductsCount = this.#productsService.lowStock;

  readonly isModalOpen = linkedSignal(() => {
    return this.productSelected() || this.productToEdit() || this.categoryToEdit() || this.isCreateMode();
  });

  readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
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

  onDeleteProductClicked(product: Product) {
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('pantry.delete_product.title'),
        message: this.#translate.instant('pantry.delete_product.message', { name: product.name }),
        confirmText: 'common.delete',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#deleteProduct.delete(this.barId(), product.id);
          this.#productsService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  onDeleteCategoryClicked(category: Category) {
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('pantry.delete_category.title'),
        message: this.#translate.instant('pantry.delete_category.message', { name: category.name }),
        confirmText: 'common.delete',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#categoriesStore.delete(category.id);
          this.closeModal();
          this.selectedCategoryId.set('ALL');
        } catch (e) {
          console.error(e);
        }
      }
    });
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

  readonly updateStockSubmit = async (payload: UpdateProductStockDto) => {
    const product = this.productSelected();
    if (!product) return null;

    this.isSubmitting.set(true);

    try {
      await this.#updateProductStock.update(this.barId(), product.id, payload);
    } catch (error: unknown) {
      this.isSubmitting.set(false);
      return handleErrorFormField(error);
    }

    this.#productsService.reload();
    this.closeModal();

    return null;
  };

  readonly productSubmit = async (payload: CreateProductDto) => {
    this.isSubmitting.set(true);

    try {
      await this.#createProduct.create(this.barId(), payload);
    } catch (error: unknown) {
      this.isSubmitting.set(false);
      return handleErrorFormField(error);
    }

    this.#productsService.reload();
    this.closeModal();

    return null;
  };

  readonly editProductSubmit = async (payload: UpdateProductDto) => {
    const product = this.productToEdit();
    if (!product) return null;

    this.isSubmitting.set(true);

    try {
      await this.#editProduct.edit(this.barId(), product.id, payload);
    } catch (error: unknown) {
      this.isSubmitting.set(false);
      return handleErrorFormField(error);
    }

    this.#productsService.reload();
    this.closeModal();

    return null;
  };
}
