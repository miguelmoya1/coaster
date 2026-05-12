import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BarId, OrderId, Product, asOrderId } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CategoriesStore } from '../../../../../categories';
import { BarOrders, CartItem, CreateOrder, ManageOrder, PosCart, PosProductGrid } from '../../../../../orders';
import { BarProducts } from '../../../../../products';
import { CoasterTitle, Loading } from '../../../../../shared';
import { BarTables } from '../../../../../tables';

@Component({
  selector: 'coaster-new-order',
  imports: [PosProductGrid, PosCart, CoasterTitle, Loading, TranslatePipe, NgIcon],
  viewProviders: [provideIcons({ lucideArrowLeft })],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './new-order.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NewOrder {
  public readonly barId = input.required<BarId>();
  public readonly tableId = input<string>();
  public readonly orderId = input<string>();

  readonly #productsService = inject(BarProducts);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #tablesService = inject(BarTables);
  readonly #ordersService = inject(BarOrders);
  readonly #createOrder = inject(CreateOrder);
  readonly #manageOrder = inject(ManageOrder);
  readonly #router = inject(Router);

  readonly selectedCategory = signal<string | undefined>(undefined);
  readonly cart = signal<Map<string, CartItem>>(new Map());
  readonly selectedTableId = signal<string | undefined>(undefined);
  readonly isSubmitting = signal(false);

  readonly existingOrderId = signal<OrderId | undefined>(undefined);
  readonly isAddItemsMode = computed(() => !!this.existingOrderId());
  readonly tableLocked = signal(false);

  readonly cartItems = computed(() => Array.from(this.cart().values()));

  protected readonly isLoadingProducts = this.#productsService.all.isLoading;
  protected readonly isLoadingCategories = this.#categoriesStore.list.isLoading;
  protected readonly categories = computed(() =>
    this.#categoriesStore.list.hasValue() ? (this.#categoriesStore.list.value() ?? []) : [],
  );
  protected readonly tables = computed(() =>
    this.#tablesService.all.hasValue() ? (this.#tablesService.all.value() ?? []) : [],
  );

  protected readonly filteredProducts = computed(() => {
    if (!this.#productsService.all.hasValue()) return [];
    const products = this.#productsService.all.value() ?? [];
    const categoryId = this.selectedCategory();
    return categoryId ? products.filter((p) => p.categoryId === categoryId) : products;
  });

  constructor() {
    effect(() => {
      const tableId = this.tableId();
      if (tableId) {
        this.selectedTableId.set(tableId);
        this.tableLocked.set(true);
      }

      const orderId = this.orderId();
      if (orderId) {
        this.existingOrderId.set(asOrderId(orderId));
        this.tableLocked.set(true);
      }
    });
  }

  goBack() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
  }

  addToCart(product: Product) {
    const current = new Map(this.cart());
    const existing = current.get(product.id);
    if (existing) {
      current.set(product.id, { ...existing, quantity: existing.quantity + 1 });
    } else {
      current.set(product.id, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
      });
    }
    this.cart.set(current);
  }

  incrementItem(productId: string) {
    const current = new Map(this.cart());
    const item = current.get(productId);
    if (item) {
      current.set(productId, { ...item, quantity: item.quantity + 1 });
      this.cart.set(current);
    }
  }

  decrementItem(productId: string) {
    const current = new Map(this.cart());
    const item = current.get(productId);
    if (item) {
      if (item.quantity <= 1) {
        current.delete(productId);
      } else {
        current.set(productId, { ...item, quantity: item.quantity - 1 });
      }
      this.cart.set(current);
    }
  }

  async submitOrder() {
    const items = this.cartItems();
    if (items.length === 0) return;

    this.isSubmitting.set(true);
    try {
      const itemDtos = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const orderId = this.existingOrderId();
      if (orderId) {
        await this.#manageOrder.addItems(this.barId(), orderId, { items: itemDtos });
      } else {
        await this.#createOrder.create(this.barId(), {
          tableId: this.selectedTableId(),
          items: itemDtos,
        });
      }

      this.cart.set(new Map());
      this.#ordersService.reload();
      this.#tablesService.reload();

      await this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
    } catch (e) {
      console.error(e);
    }
    this.isSubmitting.set(false);
  }
}

export default NewOrder;
