import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CategoriesStore } from '@coaster/categories';
import type { BarId, OrderId, TableId } from '@coaster/common';
import { asOrderId, asProductId, asTableId } from '@coaster/core';
import { OrdersStore } from '@coaster/orders';
import { Product, ProductsStore } from '@coaster/products';
import { TablesStore } from '@coaster/tables';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Loading } from '../../../../../components/loading/loading';

import { CartItem, PosCart } from '../../components/pos-cart/pos-cart';
import { PosProductGrid } from '../../components/pos-product-grid/pos-product-grid';

@Component({
  selector: 'coaster-new-order',
  imports: [PosProductGrid, PosCart, Loading, TranslatePipe, MatIcon, MatIconButton],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './new-order.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NewOrder {
  public readonly barId = input.required<BarId>();
  public readonly tableId = input<TableId>();
  public readonly orderId = input<OrderId>();

  readonly #productsStore = inject(ProductsStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #tablesStore = inject(TablesStore);
  readonly #ordersStore = inject(OrdersStore);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);

  readonly selectedCategory = signal<string | undefined>(undefined);
  readonly cart = signal<Map<string, CartItem>>(new Map());
  readonly selectedTableId = signal<string | undefined>(undefined);
  readonly isSubmitting = signal(false);

  readonly existingOrderId = signal<OrderId | undefined>(undefined);
  readonly isAddItemsMode = computed(() => !!this.existingOrderId());
  readonly tableLocked = signal(false);

  readonly cartItems = computed(() => Array.from(this.cart().values()));

  protected readonly isLoadingProducts = this.#productsStore.list.isLoading;
  protected readonly isLoadingCategories = this.#categoriesStore.list.isLoading;
  protected readonly categories = computed(() =>
    this.#categoriesStore.list.hasValue() ? (this.#categoriesStore.list.value() ?? []) : [],
  );
  protected readonly tables = computed(() =>
    this.#tablesStore.tables.hasValue() ? (this.#tablesStore.tables.value() ?? []) : [],
  );

  protected readonly filteredProducts = computed(() => {
    if (!this.#productsStore.list.hasValue()) return [];
    const products = this.#productsStore.list.value() ?? [];
    const cartMap = this.cart();
    const productsWithOptimisticStock = products.map((p) => {
      const cartItem = cartMap.get(p.id);
      const quantityInCart = cartItem ? cartItem.quantity : 0;
      return {
        ...p,
        currentStock: Math.max(0, p.currentStock - quantityInCart),
      };
    });
    const categoryId = this.selectedCategory();
    const filtered = categoryId
      ? productsWithOptimisticStock.filter((p) => p.categoryId === categoryId)
      : productsWithOptimisticStock;
    return [...filtered].sort((a, b) => {
      const nameA = this.#translate.instant(a.name) || a.name;
      const nameB = this.#translate.instant(b.name) || b.name;
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#productsStore.setBarId(barId);
      this.#categoriesStore.setBarId(barId);
      this.#tablesStore.setBarId(barId);
      this.#ordersStore.setBarId(barId);
    });

    effect(() => {
      const tableId = this.tableId();
      if (tableId) {
        this.selectedTableId.set(tableId);
        this.tableLocked.set(true);
        this.#tablesStore.setTableId(tableId);
      }

      const orderId = this.orderId();
      if (orderId) {
        const resolved = asOrderId(orderId);
        this.existingOrderId.set(resolved);
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
        productId: asProductId(item.productId),
        quantity: item.quantity,
      }));

      const orderId = this.existingOrderId();
      if (orderId) {
        await this.#ordersStore.addItems(this.barId(), orderId, { items: itemDtos });
      } else {
        await this.#ordersStore.create(this.barId(), {
          tableId: this.selectedTableId() ? asTableId(this.selectedTableId()!) : undefined,
          items: itemDtos,
        });
      }

      this.cart.set(new Map());
      this.#ordersStore.reloadOrders();
      this.#tablesStore.reload();

      await this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
    } catch (e) {
      console.error(e);
    }
    this.isSubmitting.set(false);
  }
}

export default NewOrder;
