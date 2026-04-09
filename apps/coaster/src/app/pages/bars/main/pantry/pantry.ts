import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  BarId,
  CreateCategoryDto,
  CreateProductDto,
  Product,
} from '@coaster/interfaces';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  CategoryTabs,
  CreateCategory,
  CreateCategoryForm,
} from '../../../../categories';
import { BarCategories } from '../../../../categories/services/bar-categories';
import { ApiError } from '../../../../core';
import { CurrentUser } from '../../../../core/services/current-user';
import { BarMembers } from '../../../../members';
import {
  BarProducts,
  CreateProduct,
  CreateProductForm,
  InventoryItemCard,
} from '../../../../products';
import { InventoryStatus } from '../../../../products/components/inventory-item-card/inventory-item-card';
import { BottomSheet, Fab, Loading, SectionTitle } from '../../../../shared';

@Component({
  selector: 'coaster-pantry',
  standalone: true,
  imports: [
    CategoryTabs,
    InventoryItemCard,
    CreateCategoryForm,
    CreateProductForm,
    Loading,
    SectionTitle,
    BottomSheet,
    Fab,
    TranslatePipe,
  ],
  host: {
    class: 'flex flex-col gap-2 h-full',
  },
  template: `
    <coaster-section-title
      [heading]="'pantry.title' | translate"
      [description]="
        'pantry.description' | translate: { count: filteredProducts().length }
      "
      class="mb-2"
    />

    <div class="-mx-4 px-4 mb-4">
      <coaster-category-tabs
        [tabs]="tabs()"
        [selectedTabId]="selectedCategoryId()"
        (tabSelected)="selectedCategoryId.set($event)"
      />
    </div>

    @if (categories.isLoading() || products.isLoading()) {
      <coaster-loading />
    }

    @if (products.hasValue()) {
      <div class="flex-1 overflow-y-auto pb-24 flex flex-col gap-3">
        @for (product of filteredProducts(); track product.id) {
          <coaster-inventory-item-card
            [itemName]="product.name"
            [qty]="product.currentStock"
            [statusLevel]="getProductStatus(product)"
            (click)="onProductClicked(product)"
          />
        } @empty {
          <div class="text-center text-on-surface-variant mt-10">
            {{ 'pantry.empty' | translate }}
          </div>
        }
      </div>
    }

    @if (currentUserRole() === 'OWNER') {
      <coaster-fab (click)="openBottomSheet()" />
    }

    @defer (when isSheetOpen()) {
      @let tab = currentFormTab();

      @if (isSheetOpen()) {
        <coaster-bottom-sheet (closed)="isSheetOpen.set(false)">
          <div class="flex flex-col px-6 pb-6 pt-2">
            <div class="flex bg-surface-container rounded-lg p-1 mb-6">
              <button
                class="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
                [class.bg-surface-container-high]="tab === 'PRODUCT'"
                [class.text-on-surface]="tab === 'PRODUCT'"
                [class.text-on-surface-variant]="tab !== 'PRODUCT'"
                (click)="currentFormTab.set('PRODUCT')"
              >
                {{ 'pantry.product' | translate }}
              </button>
              <button
                class="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
                [class.bg-surface-container-high]="tab === 'CATEGORY'"
                [class.text-on-surface]="tab === 'CATEGORY'"
                [class.text-on-surface-variant]="tab !== 'CATEGORY'"
                (click)="currentFormTab.set('CATEGORY')"
              >
                {{ 'pantry.category' | translate }}
              </button>
            </div>

            @switch (tab) {
              @case ('PRODUCT') {
                <coaster-create-product-form
                  [categories]="categories.value() ?? []"
                  [disabled]="isSubmitting() || products.isLoading()"
                  [(error)]="formError"
                  (createProduct)="onProductSubmit($event)"
                  (canceled)="isSheetOpen.set(false)"
                />
              }

              @case ('CATEGORY') {
                <coaster-create-category-form
                  [disabled]="isSubmitting() || categories.isLoading()"
                  [(error)]="formError"
                  (createCategory)="onCategorySubmit($event)"
                  (canceled)="isSheetOpen.set(false)"
                />
              }

              @default never;
            }
          </div>
        </coaster-bottom-sheet>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Pantry {
  public readonly barId = input.required<BarId>();

  readonly #productsService = inject(BarProducts);
  readonly #categoriesService = inject(BarCategories);
  readonly #createProduct = inject(CreateProduct);
  readonly #createCategory = inject(CreateCategory);
  readonly #currentUser = inject(CurrentUser);
  readonly #translate = inject(TranslateService);
  readonly #barMembers = inject(BarMembers);

  protected readonly isSheetOpen = signal(false);
  protected readonly currentFormTab = signal<'PRODUCT' | 'CATEGORY'>('PRODUCT');
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | undefined>(undefined);
  protected readonly selectedCategoryId = signal<string>('ALL');

  protected readonly categories = this.#categoriesService.all;
  protected readonly products = this.#productsService.all;

  protected readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list
      .value()
      ?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    console.log(barMember);
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
    if (
      product.minStockAlert !== undefined &&
      product.currentStock <= product.minStockAlert
    )
      return 'low';
    return 'good';
  }

  protected onProductClicked(product: Product) {
    console.log('Update stock for item:', product);
  }

  protected openBottomSheet() {
    this.formError.set(undefined);
    this.currentFormTab.set('PRODUCT');
    this.isSheetOpen.set(true);
  }

  protected async onProductSubmit(payload: CreateProductDto) {
    this.formError.set(undefined);

    try {
      this.isSubmitting.set(true);
      await this.#createProduct.create(this.barId(), payload);
      this.#productsService.reload();
      this.isSheetOpen.set(false);
    } catch (error: unknown) {
      this.formError.set(
        error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async onCategorySubmit(payload: CreateCategoryDto) {
    this.formError.set(undefined);

    try {
      this.isSubmitting.set(true);
      await this.#createCategory.create(this.barId(), payload);
      this.#categoriesService.reload();
      this.isSheetOpen.set(false);
    } catch (error: unknown) {
      this.formError.set(
        error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
