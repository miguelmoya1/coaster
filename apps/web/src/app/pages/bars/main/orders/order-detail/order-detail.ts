import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BarId, Order, OrderItemId, asOrderId } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRightLeft,
  lucideChefHat,
  lucideCreditCard,
  lucideMerge,
  lucidePackagePlus,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BarOrders, ManageOrder, MoveTableDialog, MoveTableDialogData } from '../../../../../orders';
import {
  MergeOrdersDialog,
  MergeOrdersDialogData,
} from '../../../../../orders/components/merge-orders-dialog/merge-orders-dialog';
import { CoasterBtn, CoasterTitle, ConfirmDialogComponent, Loading } from '../../../../../shared';
import { BarTables } from '../../../../../tables';

@Component({
  selector: 'coaster-order-detail',
  imports: [Loading, CoasterTitle, CoasterBtn, TranslatePipe, NgIcon],
  viewProviders: [
    provideIcons({
      lucideArrowLeft,
      lucideArrowRightLeft,
      lucideChefHat,
      lucideCreditCard,
      lucidePackagePlus,
      lucideMerge,
      lucideTrash2,
      lucideX,
    }),
  ],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex items-center gap-3">
      <button
        class="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-90 transition-all cursor-pointer"
        (click)="goBack()"
      >
        <ng-icon name="lucideArrowLeft" size="22" />
      </button>
      <h2 coaster-title class="flex-1!">{{ title() }}</h2>
    </div>

    @if (ordersService.all.isLoading() || isLoading()) {
      <coaster-loading />
    }

    @if (displayOrder(); as order) {
      <div class="flex justify-between items-center bg-surface-container rounded-2xl p-4">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-on-surface-variant font-medium">
            @if (order.status === 'OPEN') {
              {{ 'orders.open_orders' | translate }}
            } @else if (order.status === 'CLOSED') {
              {{ 'history.status_closed' | translate }}
            } @else {
              {{ 'history.status_cancelled' | translate }}
            }
          </span>
          <span class="text-xs text-on-surface-variant"
            >{{ order.items.length }} {{ 'history.items' | translate }}</span
          >
        </div>
        <span class="text-2xl font-black" [class.text-primary]="order.status === 'OPEN'">{{
          formatPrice(order.totalAmount)
        }}</span>
      </div>

      <div class="flex flex-col gap-2">
        @for (item of order.items; track item.id) {
          <div
            class="bg-surface-container rounded-xl p-4 flex items-center gap-3"
            [class.opacity-50]="item.paymentStatus === 'PAID'"
          >
            <div class="flex-1 flex flex-col gap-1">
              <span class="font-semibold text-on-surface text-sm">{{ item.productName ?? item.productId }}</span>
              <div class="flex gap-2 items-center">
                <span class="text-xs text-on-surface-variant">x{{ item.quantity }}</span>
                <span class="text-xs font-bold text-on-surface">{{
                  formatPrice(item.priceAtPurchase * item.quantity)
                }}</span>
              </div>
              <div class="flex gap-1.5 mt-1">
                @if (item.paymentStatus === 'PAID') {
                  <span class="text-xxs font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                    {{ 'orders.paid' | translate }}
                  </span>
                }
                @if (item.deliveryStatus === 'SERVED') {
                  <span class="text-xxs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                    {{ 'orders.served' | translate }}
                  </span>
                }
              </div>
            </div>

            <div class="flex gap-1">
              @if (order.status === 'OPEN') {
                @if (item.deliveryStatus !== 'SERVED') {
                  <button
                    class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    (click)="onDeliverItem(item.id)"
                    [title]="'orders.mark_served' | translate"
                  >
                    <ng-icon name="lucideChefHat" size="18" />
                  </button>
                }
                @if (item.paymentStatus !== 'PAID') {
                  <button
                    class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    (click)="onPayItem(item.id)"
                    [title]="'orders.mark_paid' | translate"
                  >
                    <ng-icon name="lucideCreditCard" size="18" />
                  </button>
                }
                <button
                  class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  (click)="onRemoveItem(item.id)"
                  [title]="'orders.remove_item' | translate"
                >
                  <ng-icon name="lucideTrash2" size="18" />
                </button>
              }
            </div>
          </div>
        }
      </div>

      @if (order.status === 'OPEN') {
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button coaster-btn variant="outline" (click)="onAddItems()">
            <ng-icon name="lucidePackagePlus" size="18" />
            {{ 'orders.add_items' | translate }}
          </button>
          <button coaster-btn (click)="onCheckout()">
            <ng-icon name="lucideCreditCard" size="18" />
            {{ 'orders.checkout' | translate }}
          </button>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button coaster-btn variant="outline" (click)="onMoveTable()">
            <ng-icon name="lucideArrowRightLeft" size="16" />
            {{ (order.tableId ? 'orders.move' : 'orders.assign_table') | translate }}
          </button>
          <button coaster-btn variant="outline" (click)="onMerge()">
            <ng-icon name="lucideMerge" size="16" />
            {{ 'orders.merge' | translate }}
          </button>
          <button coaster-btn variant="outline" class="text-error!" (click)="onCancel()">
            <ng-icon name="lucideX" size="16" />
            {{ 'orders.cancel_order' | translate }}
          </button>
        </div>
      }
    } @else {
      @if (!ordersService.all.isLoading() && !isLoading()) {
        <div class="flex flex-col items-center gap-4 py-12 text-center">
          <span class="text-on-surface-variant text-lg">{{ 'orders.order_not_found' | translate }}</span>
          <button coaster-btn (click)="goBack()">
            {{ 'orders.tables_title' | translate }}
          </button>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class OrderDetail {
  public readonly barId = input.required<BarId>();
  public readonly orderId = input.required<string>();

  readonly ordersService = inject(BarOrders);
  readonly tablesService = inject(BarTables);
  readonly #manageOrder = inject(ManageOrder);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly fetchedOrder = signal<Order | null>(null);
  readonly isLoading = signal(false);

  readonly currentOrder = computed(() => {
    const orders = this.ordersService.openOrders();
    return orders.find((o) => o.id === this.resolvedOrderId()) ?? null;
  });

  readonly displayOrder = computed(() => this.currentOrder() ?? this.fetchedOrder());

  readonly title = computed(() => {
    const order = this.displayOrder();
    if (!order) return '...';
    if (order.tableName) return order.tableName;
    return this.#translate.instant('orders.bar_order_title');
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.ordersService.setBarContext(barId);
      this.tablesService.setBarContext(barId);
    });

    effect(async () => {
      const current = this.currentOrder();
      if (!current) {
        this.isLoading.set(true);
        try {
          const order = await this.#manageOrder.getOrder(this.barId(), this.resolvedOrderId());
          this.fetchedOrder.set(order);
        } catch (e) {
          console.error(e);
        } finally {
          this.isLoading.set(false);
        }
      } else {
        this.fetchedOrder.set(null);
      }
    });
  }

  goBack() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
  }

  formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' €';
  }

  onAddItems() {
    const order = this.currentOrder();
    if (!order) return;
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id, 'add']);
  }

  async onPayItem(itemId: OrderItemId) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#manageOrder.payItem(this.barId(), order.id, itemId);
      this.ordersService.reload();
    } catch (e) {
      console.error(e);
    }
  }

  async onDeliverItem(itemId: OrderItemId) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#manageOrder.deliverItem(this.barId(), order.id, itemId);
      this.ordersService.reload();
    } catch (e) {
      console.error(e);
    }
  }

  async onCheckout() {
    const order = this.currentOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('orders.checkout_title'),
        message: this.#translate.instant('orders.checkout_message'),
        confirmText: 'orders.checkout',
        cancelText: 'common.cancel',
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#manageOrder.checkout(this.barId(), order.id);
          this.ordersService.reload();
          this.tablesService.reload();
          this.goBack();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  async onCancel() {
    const order = this.currentOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('orders.cancel_title'),
        message: this.#translate.instant('orders.cancel_message'),
        confirmText: 'orders.cancel_order',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#manageOrder.cancel(this.barId(), order.id);
          this.ordersService.reload();
          this.tablesService.reload();
          this.goBack();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  onMoveTable() {
    const order = this.currentOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(MoveTableDialog, {
      data: {
        tables: this.tablesService.all.value() ?? [],
        currentTableId: order.tableId,
      } satisfies MoveTableDialogData,
    });

    dialogRef.closed.subscribe(async (result) => {
      const targetTableId = result as string | undefined;
      if (targetTableId) {
        try {
          await this.#manageOrder.moveTable(this.barId(), order.id, { tableId: targetTableId });
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  onMerge() {
    const order = this.currentOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(MergeOrdersDialog, {
      data: {
        orders: this.ordersService.openOrders(),
        currentOrderId: order.id,
      } satisfies MergeOrdersDialogData,
    });

    dialogRef.closed.subscribe(async (result) => {
      const targetOrderId = result as string | undefined;
      if (targetOrderId) {
        try {
          await this.#manageOrder.merge(this.barId(), {
            orderIds: [order.id, targetOrderId],
          });
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  onRemoveItem(itemId: OrderItemId) {
    const order = this.currentOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('orders.remove_item_title'),
        message: this.#translate.instant('orders.remove_item_message'),
        confirmText: 'common.delete',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#manageOrder.removeItem(this.barId(), order.id, itemId);
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default OrderDetail;
