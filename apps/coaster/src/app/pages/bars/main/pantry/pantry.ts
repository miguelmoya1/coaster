import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import {
  BarId,
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateProductStockDto,
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
import { CurrentUser, handleErrorFormField } from '../../../../core';
import { BarMembers } from '../../../../members';
import {
  BarProducts,
  CreateProduct,
  CreateProductForm,
  EditProduct,
  EditProductForm,
  InventoryItemCard,
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
    RouterLink,
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

  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  protected readonly isCreateMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['new']),
    this.#router,
  );

  protected readonly currentFormTab = signal<'PRODUCT' | 'CATEGORY'>('PRODUCT');
  protected readonly isSubmitting = signal(false);
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
    if (!this.products.hasValue()) return [];

    const allProducts = this.products.value();
    const categoryId = this.selectedCategoryId();

    return categoryId === 'ALL' ? allProducts : allProducts.filter((p) => p.categoryId === categoryId);
  });

  constructor() {
    effect(() => {
      this.#productsService.setBarContext(this.barId());
      this.#categoriesService.setBarContext(this.barId());
      this.#barMembers.setBarContext(this.barId());
    });
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

  protected closeModal() {
    this.currentFormTab.set('PRODUCT');
    this.#router.navigate(['/bars', this.barId(), 'pantry']);
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
    this.productSelected.set(null);
    this.isSubmitting.set(false);

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
    this.isSubmitting.set(false);

    return null;
  };

  readonly categorySubmit = async (payload: CreateCategoryDto) => {
    this.isSubmitting.set(true);

    try {
      await this.#createCategory.create(this.barId(), payload);
    } catch (error: unknown) {
      this.isSubmitting.set(false);
      return handleErrorFormField(error);
    }

    this.#categoriesService.reload();
    this.closeModal();
    this.isSubmitting.set(false);

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
    this.productToEdit.set(null);
    this.isSubmitting.set(false);

    return null;
  };

  readonly editCategorySubmit = async (payload: UpdateCategoryDto) => {
    const category = this.categoryToEdit();
    if (!category) return null;

    this.isSubmitting.set(true);

    try {
      await this.#editCategory.edit(this.barId(), category.id, payload);
    } catch (error: unknown) {
      this.isSubmitting.set(false);
      return handleErrorFormField(error);
    }

    this.#categoriesService.reload();
    this.categoryToEdit.set(null);
    this.isSubmitting.set(false);

    return null;
  };
}
