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
import { BarOrderHistory, BarOrders, ManageOrder, MoveTableDialog, MoveTableDialogData } from '../../../../../orders';
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
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class OrderDetail {
  public readonly barId = input.required<BarId>();
  public readonly orderId = input.required<string>();

  readonly #ordersService = inject(BarOrders);
  readonly #tablesService = inject(BarTables);
  readonly #manageOrder = inject(ManageOrder);
  readonly #historyService = inject(BarOrderHistory);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly fetchedOrder = signal<Order | null>(null);
  readonly isLoading = signal(false);

  readonly currentOrder = computed(() => {
    const orders = this.#ordersService.openOrders();
    return orders.find((o) => o.id === this.resolvedOrderId()) ?? null;
  });

  readonly displayOrder = computed(() => this.currentOrder() ?? this.fetchedOrder());

  protected readonly displayOrderViewModel = computed(() => {
    const order = this.displayOrder();
    if (!order) return null;

    return {
      ...order,
      formattedTotalAmount: this.#formatPrice(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        productName: item.productName ?? item.productId,
        formattedPrice: this.#formatPrice(item.priceAtPurchase * item.quantity),
      })),
    };
  });

  protected readonly isLoadingServices = this.#ordersService.all.isLoading;

  readonly title = computed(() => {
    const order = this.displayOrder();
    if (!order) return '...';
    if (order.tableName) return order.tableName;
    return this.#translate.instant('orders.bar_order_title');
  });

  constructor() {
    effect(async () => {
      if (this.#isNavigatingAway) return;
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

  #isNavigatingAway = false;

  async goBack() {
    this.#isNavigatingAway = true;
    await this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
  }

  #formatPrice(cents: number): string {
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
      this.#ordersService.reload();
    } catch (e) {
      console.error(e);
    }
  }

  async onDeliverItem(itemId: OrderItemId) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#manageOrder.deliverItem(this.barId(), order.id, itemId);
      this.#ordersService.reload();
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
          this.goBack();
          this.#ordersService.reload();
          this.#tablesService.reload();
          this.#historyService.reload();
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
          this.goBack();
          this.#ordersService.reload();
          this.#tablesService.reload();
          this.#historyService.reload();
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
        tables: this.#tablesService.all.hasValue() ? (this.#tablesService.all.value() ?? []) : [],
        currentTableId: order.tableId,
      } satisfies MoveTableDialogData,
    });

    dialogRef.closed.subscribe(async (result) => {
      const targetTableId = result as string | undefined;
      if (targetTableId) {
        try {
          await this.#manageOrder.moveTable(this.barId(), order.id, { tableId: targetTableId });
          this.#ordersService.reload();
          this.#tablesService.reload();
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
        orders: this.#ordersService.openOrders(),
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
          this.#ordersService.reload();
          this.#tablesService.reload();
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
          this.#ordersService.reload();
          this.#tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default OrderDetail;
