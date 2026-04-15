import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  BarId,
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  UpdateCategoryDto,
  UpdateProductDto,
} from '@coaster/interfaces';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  BarCategories,
  CategoryTabs,
  CreateCategory,
  CreateCategoryForm,
  EditCategory,
  EditCategoryForm,
} from '../../../../categories';
import { ApiError, CurrentUser } from '../../../../core';
import { BarMembers } from '../../../../members';
import {
  BarProducts,
  CreateProduct,
  CreateProductForm,
  EditProduct,
  EditProductForm,
  InventoryItemCard,
  InventoryStatus,
  UpdateProduct,
  UpdateProductForm,
} from '../../../../products';
import { BottomSheet, CoasterTitle, Fab, Loading, StatusCard } from '../../../../shared';

@Component({
  selector: 'coaster-pantry',
  imports: [
    CategoryTabs,
    InventoryItemCard,
    CreateCategoryForm,
    CreateProductForm,
    Loading,
    BottomSheet,
    Fab,
    TranslatePipe,
    UpdateProductForm,
    EditProductForm,
    EditCategoryForm,
    StatusCard,
    CoasterTitle,
    NgIcon,
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
  readonly #categoriesService = inject(BarCategories);
  readonly #createProduct = inject(CreateProduct);
  readonly #createCategory = inject(CreateCategory);
  readonly #editCategory = inject(EditCategory);
  readonly #currentUser = inject(CurrentUser);
  readonly #translate = inject(TranslateService);
  readonly #barMembers = inject(BarMembers);
  readonly #editProduct = inject(EditProduct);
  readonly #updateProductStock = inject(UpdateProduct);

  protected readonly isSheetOpen = signal(false);
  protected readonly currentFormTab = signal<'PRODUCT' | 'CATEGORY'>('PRODUCT');
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | undefined>(undefined);
  protected readonly selectedCategoryId = signal<string>('ALL');
  protected readonly productSelected = signal<Product | null>(null);
  protected readonly productToEdit = signal<Product | null>(null);
  protected readonly categoryToEdit = signal<Category | null>(null);

  protected readonly categories = this.#categoriesService.all;
  protected readonly products = this.#productsService.all;
  protected readonly totalProductsCount = this.#productsService.total;
  protected readonly criticalProductsCount = this.#productsService.criticalStock;
  protected readonly alertProductsCount = this.#productsService.lowStock;

  protected readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    return barMember?.role;
  });

  protected readonly tabs = computed(() => {
    const rawCategories = this.categories.value() ?? [];
    return [
      { id: 'ALL', label: this.#translate.instant('pantry.all') },
      ...rawCategories.map((c) => ({ id: c.id, label: c.name })),
    ];
  });

  protected readonly filteredProducts = computed(() => {
    const allProducts = this.products.value() ?? [];
    const categoryId = this.selectedCategoryId();

    if (categoryId === 'ALL') {
      return allProducts;
    }
    return allProducts.filter((p) => p.categoryId === categoryId);
  });

  constructor() {
    effect(() => {
      this.#productsService.setBarContext(this.barId());
      this.#categoriesService.setBarContext(this.barId());
      this.#barMembers.setBarContext(this.barId());
    });
  }

  protected getProductStatus(product: Product): InventoryStatus {
    if (product.currentStock <= 0) return 'critical';
    if (product.minStockAlert !== undefined && product.currentStock <= product.minStockAlert) return 'low';
    return 'good';
  }

  protected onProductClicked(product: Product) {
    this.productSelected.set(product);
  }

  protected onEditProductClicked(product: Product) {
    this.productToEdit.set(product);
  }

  protected unselectProduct() {
    this.productSelected.set(null);
  }

  protected unselectProductToEdit() {
    this.productToEdit.set(null);
  }

  protected unselectCategoryToEdit() {
    this.categoryToEdit.set(null);
  }

  protected onEditCategoryClicked() {
    const categoryId = this.selectedCategoryId();
    if (categoryId === 'ALL') return;
    const cat = this.categories.value()?.find((c) => c.id === categoryId);
    if (cat) {
      this.categoryToEdit.set(cat);
    }
  }

  protected async onUpdateStockSubmit(payload: { currentStock: number }) {
    const product = this.productSelected();
    if (!product) return;

    await this.#handleFormSubmission(
      async () => {
        await this.#updateProductStock.update(this.barId(), product.id, payload);
      },
      () => {
        this.#productsService.reload();
        this.productSelected.set(null);
      },
    );
  }

  protected openBottomSheet() {
    this.formError.set(undefined);
    this.currentFormTab.set('PRODUCT');
    this.isSheetOpen.set(true);
  }

  protected async onProductSubmit(payload: CreateProductDto) {
    await this.#handleFormSubmission(
      async () => {
        await this.#createProduct.create(this.barId(), payload);
      },
      () => {
        this.#productsService.reload();
        this.isSheetOpen.set(false);
      },
    );
  }

  protected async onCategorySubmit(payload: CreateCategoryDto) {
    await this.#handleFormSubmission(
      async () => {
        await this.#createCategory.create(this.barId(), payload);
      },
      () => {
        this.#categoriesService.reload();
        this.isSheetOpen.set(false);
      },
    );
  }

  protected async onEditProductSubmit(payload: UpdateProductDto) {
    const product = this.productToEdit();
    if (!product) return;

    await this.#handleFormSubmission(
      async () => {
        await this.#editProduct.edit(this.barId(), product.id, payload);
      },
      () => {
        this.#productsService.reload();
        this.productToEdit.set(null);
      },
    );
  }

  protected async onEditCategorySubmit(payload: UpdateCategoryDto) {
    const category = this.categoryToEdit();
    if (!category) return;

    await this.#handleFormSubmission(
      async () => {
        await this.#editCategory.edit(this.barId(), category.id, payload);
      },
      () => {
        this.#categoriesService.reload();
        this.categoryToEdit.set(null);
      },
    );
  }

  async #handleFormSubmission(action: () => Promise<void>, onSuccess: () => void) {
    this.formError.set(undefined);
    try {
      this.isSubmitting.set(true);
      await action();
      onSuccess();
    } catch (error: unknown) {
      this.formError.set(error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
