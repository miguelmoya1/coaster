import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { BarId, BarRole, Product } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CategoryTabs } from '../../../../categories';
import { BarCategories } from '../../../../categories/services/bar-categories';
import { CurrentUser } from '../../../../core/services/current-user';
import { BarMembers } from '../../../../members';
import { BarProducts, InventoryItemCard } from '../../../../products';
import { InventoryStatus } from '../../../../products/components/inventory-item-card/inventory-item-card';
import { BottomSheet, Fab, Loading, SectionTitle } from '../../../../shared';

@Component({
  selector: 'coaster-pantry',
  standalone: true,
  imports: [
    CategoryTabs,
    InventoryItemCard,
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
          <!-- [locationText]="$any(product).location || ''" -->
        } @empty {
          <div class="text-center text-on-surface-variant mt-10">
            {{ 'pantry.empty' | translate }}
          </div>
        }
      </div>
    }

    @if (showCreateButton()) {
      <coaster-fab (click)="openBottomSheet()" />
    }

    @defer (when isSheetOpen()) {
      @if (isSheetOpen()) {
        <coaster-bottom-sheet (closed)="isSheetOpen.set(false)">
          <div class="p-6 text-on-surface">
            Formulario para crear/editar productos (Próximamente)
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
  readonly #currentUser = inject(CurrentUser);
  readonly #barMembers = inject(BarMembers);

  protected readonly categories = this.#categoriesService.all;
  protected readonly products = this.#productsService.all;
  protected readonly isSheetOpen = signal(false);
  protected readonly selectedCategoryId = signal<string>('ALL');

  readonly #currentUserMember = computed(() => {
    if (!this.#currentUser.current.hasValue()) {
      return null;
    }
    const user = this.#currentUser.current.value();

    if (!this.#barMembers.list.hasValue()) {
      return null;
    }

    const members = this.#barMembers.list.value();

    return members?.find((m) => m.userId === user.id);
  });

  protected readonly showCreateButton = computed(() => {
    const member = this.#currentUserMember();
    return member?.role === BarRole.OWNER;
  });

  protected readonly tabs = computed(() => {
    const rawCategories = this.categories.value() ?? [];
    return [
      { id: 'ALL', label: 'All' },
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
      this.#barMembers.selectBar(this.barId());
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
    this.isSheetOpen.set(true);
  }
}
