import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BarId, Product } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { BarCategories } from '../../../../../categories';
import { BarOrders, CreateOrder, PosProductGrid } from '../../../../../orders';
import { CartItem, PosCart } from '../../../../../orders/components/pos-cart/pos-cart';
import { BarProducts } from '../../../../../products';
import { CoasterTitle, Loading } from '../../../../../shared';
import { BarTables } from '../../../../../tables';

@Component({
  selector: 'coaster-pos-view',
  imports: [PosProductGrid, PosCart, CoasterTitle, Loading, TranslatePipe],
  host: { class: 'flex flex-col gap-4' },
  template: `
    @if (productsService.all.isLoading() || categoriesService.all.isLoading()) {
      <coaster-loading />
    }

    <h2 coaster-title>{{ 'orders.pos_title' | translate }}</h2>

    <div class="flex flex-col lg:flex-row gap-4 pb-24">
      <div class="flex-1">
        <coaster-pos-product-grid
          [products]="filteredProducts()"
          [categories]="categoriesService.all.value() ?? []"
          [selectedCategory]="selectedCategory()"
          (productClicked)="addToCart($event)"
          (categorySelected)="selectedCategory.set($event)"
        />
      </div>

      <div class="lg:w-80 lg:sticky lg:top-20">
        <coaster-pos-cart
          [items]="cartItems()"
          [tables]="tablesService.all.value() ?? []"
          [selectedTableId]="selectedTableId()"
          [disabled]="isSubmitting()"
          (incrementClicked)="incrementItem($event)"
          (decrementClicked)="decrementItem($event)"
          (tableSelected)="selectedTableId.set($event)"
          (submitClicked)="submitOrder()"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PosView {
  public readonly barId = input.required<BarId>();

  readonly productsService = inject(BarProducts);
  readonly categoriesService = inject(BarCategories);
  readonly tablesService = inject(BarTables);
  readonly #ordersService = inject(BarOrders);
  readonly #createOrder = inject(CreateOrder);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly selectedCategory = signal<string | undefined>(undefined);
  readonly cart = signal<Map<string, CartItem>>(new Map());
  readonly selectedTableId = signal<string | undefined>(undefined);
  readonly isSubmitting = signal(false);

  readonly cartItems = computed(() => Array.from(this.cart().values()));

  readonly filteredProducts = computed(() => {
    const products = this.productsService.all.value() ?? [];
    const categoryId = this.selectedCategory();
    return categoryId ? products.filter((p) => p.categoryId === categoryId) : products;
  });

  constructor() {
    const queryTableId = this.#route.snapshot.queryParamMap.get('tableId');
    if (queryTableId) {
      this.selectedTableId.set(queryTableId);
    }

    effect(() => {
      const barId = this.barId();
      this.productsService.setBarContext(barId);
      this.categoriesService.setBarContext(barId);
      this.tablesService.setBarContext(barId);
    });
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
      await this.#createOrder.create(this.barId(), {
        tableId: this.selectedTableId(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      this.cart.set(new Map());
      this.selectedTableId.set(undefined);
      this.#ordersService.reload();
      this.tablesService.reload();

      await this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
    } catch (e) {
      console.error(e);
    }
    this.isSubmitting.set(false);
  }
}
