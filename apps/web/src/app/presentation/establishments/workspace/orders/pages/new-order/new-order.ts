import { asOrderId, asProductId, asTableId } from '@coaster/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import type { Category, EstablishmentId, Order, OrderId, Table, TableId } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { ManageOrder } from '@coaster/orders';
import type { Product } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ResourceStatus } from '../../../../../components/resource-status/resource-status';

import { CategoryFilter } from '../../../../../components/category-filter/category-filter';
import { CartItem, PosCart } from './components/pos-cart/pos-cart';
import { PosProductsList } from './components/pos-products-list/pos-products-list';
import { PosSearch } from './components/pos-search/pos-search';

@Component({
  selector: 'coaster-new-order',
  imports: [CategoryFilter, PosProductsList, PosSearch, PosCart, ResourceStatus, TranslatePipe, MatIcon, MatIconButton],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './new-order.html',
})
class NewOrder {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly tableId = input<TableId>();
  public readonly orderId = input<OrderId>();
  public readonly products = input.required<PageResource<Product[]>>();
  public readonly categories = input.required<PageResource<Category[]>>();
  public readonly tables = input.required<PageResource<Table[]>>();
  public readonly order = input<PageResource<Order>>();

  readonly #manageOrder = inject(ManageOrder);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);

  readonly selectedCategory = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly cart = signal<Map<string, CartItem>>(new Map());
  readonly selectedTableId = signal<string | undefined>(undefined);
  readonly orderNotes = signal<string>('');
  readonly isSubmitting = signal(false);

  readonly existingOrderId = signal<OrderId | undefined>(undefined);
  readonly isAddItemsMode = computed(() => !!this.existingOrderId());
  readonly tableLocked = signal(false);
  #initialNotesLoaded = false;

  readonly cartItems = computed(() => Array.from(this.cart().values()));

  protected readonly categoryList = computed(() => loadedOr(this.categories(), []));
  protected readonly tableList = computed(() => loadedOr(this.tables(), []));

  protected readonly filteredProducts = computed(() => {
    const products = loadedOr(this.products(), []);
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
    let filtered =
      categoryId && categoryId !== 'ALL'
        ? productsWithOptimisticStock.filter((p) => p.categoryId === categoryId)
        : productsWithOptimisticStock;

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter((p) => {
        const rawNameMatches = p.name.toLowerCase().includes(query);
        if (rawNameMatches) return true;

        const translatedName = this.#translate.instant(p.name);
        return translatedName.toLowerCase().includes(query);
      });
    }

    return [...filtered].sort((a, b) => {
      const nameA = this.#translate.instant(a.name) || a.name;
      const nameB = this.#translate.instant(b.name) || b.name;
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
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
        const resolved = asOrderId(orderId);
        this.existingOrderId.set(resolved);
        this.tableLocked.set(true);
      }
    });

    effect(() => {
      const orderId = this.existingOrderId();
      if (!orderId || this.#initialNotesLoaded) return;

      const order = this.order();
      const existingOrder = order?.hasValue() ? order.value() : undefined;
      if (existingOrder) {
        if (existingOrder.notes) {
          this.orderNotes.set(existingOrder.notes);
        }
        this.#initialNotesLoaded = true;
      }
    });
  }

  goBack() {
    this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'tables']);
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
        notes: '',
      });
    }
    this.cart.set(current);
  }

  updateItemNotes(event: { productId: string; notes: string }) {
    const current = new Map(this.cart());
    const item = current.get(event.productId);
    if (item) {
      current.set(event.productId, { ...item, notes: event.notes });
      this.cart.set(current);
    }
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
        notes: item.notes,
      }));

      const orderId = this.existingOrderId();
      if (orderId) {
        await this.#manageOrder.addItems(this.establishmentId(), orderId, {
          items: itemDtos,
          notes: this.orderNotes(),
        });
      } else {
        await this.#manageOrder.create(this.establishmentId(), {
          tableId: this.selectedTableId() ? asTableId(this.selectedTableId()!) : undefined,
          items: itemDtos,
          notes: this.orderNotes(),
        });
      }

      this.cart.set(new Map());
      this.orderNotes.set('');

      await this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'tables']);
    } catch (e) {
      this.#feedback.error(e);
    }
    this.isSubmitting.set(false);
  }
}

export default NewOrder;
