import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BarId, Order, OrderItem, asOrderId } from '@coaster/common';
import { OrderTitlePipe, OrdersStore } from '@coaster/orders';
import { CoasterBtn, CoasterTitle, ConfirmDialogComponent, Loading, PricePipe } from '@coaster/shared';
import { TablesStore } from '@coaster/tables';
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
import { TranslatePipe } from '@ngx-translate/core';
import { MergeOrdersDialog, MergeOrdersDialogData } from '../../components/merge-orders-dialog/merge-orders-dialog';
import { MoveTableDialog, MoveTableDialogData } from '../../components/move-table-dialog/move-table-dialog';

@Component({
  selector: 'coaster-order-detail',
  imports: [
    Loading,
    CoasterTitle,
    CoasterBtn,
    TranslatePipe,
    NgIcon,
    PricePipe,
    OrderTitlePipe,
    ConfirmDialogComponent,
  ],
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
  readonly #tablesStore = inject(TablesStore);
  readonly #dialog = inject(Dialog);
  readonly #router = inject(Router);

  protected readonly orderItemDeleting = signal<OrderItem | null>(null);
  protected readonly isCancelingOrderModelOpen = signal(false);
  protected readonly isCheckoutOrderModelOpen = signal(false);

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

  #isNavigatingAway = false;

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

  async goBack() {
    this.#isNavigatingAway = true;
    await this.#router.navigate(['/bars', this.barId(), 'orders', 'tables']);
  }

  onAddItems() {
    const order = this.currentOrder();
    if (!order) return;
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id, 'add']);
  }

  async onPayItem(item: OrderItem) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#ordersStore.payItem(this.barId(), order.id, item.id);
    } catch (e) {
      console.error(e);
    }
  }

  async onDeliverItem(item: OrderItem) {
    const order = this.currentOrder();
    if (!order) {
      return;
    }
    try {
      await this.#ordersStore.deliverItem(this.barId(), order.id, item.id);
    } catch (e) {
      console.error(e);
    }
  }

  protected handleOpenCheckout() {
    this.isCheckoutOrderModelOpen.set(true);
  }

  protected handleCancelCheckout() {
    this.isCheckoutOrderModelOpen.set(false);
  }

  protected async handleCheckoutConfirmed() {
    const order = this.currentOrder();
    if (!order) {
      return;
    }

    await this.#ordersStore.checkout(this.barId(), order.id);
    this.goBack();
    this.#tablesStore.reload();
    this.#ordersStore.reloadHistory();
    this.isCheckoutOrderModelOpen.set(false);
  }

  protected handleCancelOrder() {
    this.isCancelingOrderModelOpen.set(true);
  }

  protected handleCancelCancelOrderDialog() {
    this.isCancelingOrderModelOpen.set(false);
  }

  protected async handleCancelOrderConfirmed() {
    const order = this.currentOrder();
    if (!order) return;

    await this.#ordersStore.cancel(this.barId(), order.id);
    this.goBack();
    this.#tablesStore.reload();
    this.#ordersStore.reloadHistory();
    this.isCancelingOrderModelOpen.set(false);
  }

  protected handleRemoveItem(item: OrderItem) {
    this.orderItemDeleting.set(item);
  }

  protected handleCancelRemoveItem() {
    this.orderItemDeleting.set(null);
  }

  protected async handleRemoveItemConfirmed() {
    const order = this.currentOrder();
    const item = this.orderItemDeleting();
    if (!order || !item) {
      return;
    }

    await this.#ordersStore.removeItem(this.barId(), order.id, item.id);
    this.#tablesStore.reload();
    this.orderItemDeleting.set(null);
  }

  onMoveTable() {
    const order = this.currentOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(MoveTableDialog, {
      data: {
        tables: this.#tablesStore.tables.hasValue() ? (this.#tablesStore.tables.value() ?? []) : [],
        currentTableId: order.tableId,
      } satisfies MoveTableDialogData,
    });

    dialogRef.closed.subscribe(async (result) => {
      const targetTableId = result as string | undefined;
      if (targetTableId) {
        try {
          await this.#ordersStore.moveTable(this.barId(), order.id, { tableId: targetTableId });
          this.#ordersStore.reloadOrders();
          this.#tablesStore.reload();
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
          this.#tablesStore.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default OrderDetail;
