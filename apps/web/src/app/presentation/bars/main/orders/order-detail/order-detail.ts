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
import { OrdersStore } from '../../../../../orders';
import {
  MergeOrdersDialog,
  MergeOrdersDialogData,
} from '../../../../../orders/components/merge-orders-dialog/merge-orders-dialog';
import {
  MoveTableDialog,
  MoveTableDialogData,
} from '../../../../../orders/components/move-table-dialog/move-table-dialog';
import { OrderTitlePipe } from '../../../../../orders/pipes/order-title';
import { CoasterBtn, CoasterTitle, ConfirmDialogComponent, Loading, PricePipe } from '../../../../../shared';
import { BarTables } from '../../../../../tables';

@Component({
  selector: 'coaster-order-detail',
  imports: [Loading, CoasterTitle, CoasterBtn, TranslatePipe, NgIcon, PricePipe, OrderTitlePipe],
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

  readonly #ordersStore = inject(OrdersStore);
  readonly #tablesService = inject(BarTables);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly fetchedOrder = signal<Order | null>(null);
  readonly isLoading = signal(false);

  readonly currentOrder = computed(() => {
    const orders = this.#ordersStore.openOrders();
    return orders.find((o) => o.id === this.resolvedOrderId()) ?? null;
  });

  readonly displayOrder = computed(() => this.currentOrder() ?? this.fetchedOrder());

  protected readonly displayOrderViewModel = computed(() => {
    const order = this.displayOrder();
    if (!order) return null;

    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        productName: item.productName ?? item.productId,
      })),
    };
  });

  protected readonly isLoadingServices = this.#ordersStore.list.isLoading;

  constructor() {
    effect(async () => {
      if (this.#isNavigatingAway) return;
      const current = this.currentOrder();
      if (!current) {
        this.isLoading.set(true);
        try {
          const order = await this.#ordersStore.getOrder(this.barId(), this.resolvedOrderId());
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

  onAddItems() {
    const order = this.currentOrder();
    if (!order) return;
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id, 'add']);
  }

  async onPayItem(itemId: OrderItemId) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#ordersStore.payItem(this.barId(), order.id, itemId);
    } catch (e) {
      console.error(e);
    }
  }

  async onDeliverItem(itemId: OrderItemId) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#ordersStore.deliverItem(this.barId(), order.id, itemId);
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
          await this.#ordersStore.checkout(this.barId(), order.id);
          this.goBack();
          this.#tablesService.reload();
          this.#ordersStore.reloadHistory();
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
          await this.#ordersStore.cancel(this.barId(), order.id);
          this.goBack();
          this.#tablesService.reload();
          this.#ordersStore.reloadHistory();
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
          await this.#ordersStore.moveTable(this.barId(), order.id, { tableId: targetTableId });
          this.#ordersStore.reloadOrders();
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
        orders: this.#ordersStore.openOrders(),
        currentOrderId: order.id,
      } satisfies MergeOrdersDialogData,
    });

    dialogRef.closed.subscribe(async (result) => {
      const targetOrderId = result as string | undefined;
      if (targetOrderId) {
        try {
          await this.#ordersStore.merge(this.barId(), {
            orderIds: [order.id, targetOrderId],
          });
          this.#ordersStore.reloadOrders();
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
          await this.#ordersStore.removeItem(this.barId(), order.id, itemId);
          this.#tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default OrderDetail;
