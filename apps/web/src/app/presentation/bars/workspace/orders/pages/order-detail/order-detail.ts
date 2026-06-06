import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { BarId, BulkUpdateItemDto, Order, OrderItem, PaymentMethod } from '@coaster/common';
import { asOrderId, asOrderItemId, asTableId } from '@coaster/core';
import { OrderTitlePipe, OrdersStore } from '@coaster/orders';
import { TablesStore } from '@coaster/tables';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRightLeft,
  lucideBanknote,
  lucideCheck,
  lucideCheckSquare,
  lucideChefHat,
  lucideCreditCard,
  lucideMerge,
  lucidePackagePlus,
  lucideSquare,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { Loading } from '../../../../../components/loading/loading';
import { CoasterTitle } from '../../../../../components/typography/typography';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { PricePipe } from '../../../pipes/price/price';
import { MergeOrdersDialog } from '../../components/merge-orders-dialog/merge-orders-dialog';
import { MoveTableDialog } from '../../components/move-table-dialog/move-table-dialog';
import { CoasterQtyAdjuster } from '../../components/qty-adjuster/qty-adjuster';
import { PaymentMethodDialog } from '../../components/payment-method-dialog/payment-method-dialog';

@Component({
  selector: 'coaster-order-detail',
  imports: [
    Loading,
    CoasterTitle,
    MatButton,
    TranslatePipe,
    NgIcon,
    PricePipe,
    OrderTitlePipe,
    ConfirmDialogComponent,
    MoveTableDialog,
    MergeOrdersDialog,
    CoasterQtyAdjuster,
    PaymentMethodDialog,
  ],
  viewProviders: [
    provideIcons({
      lucideArrowLeft,
      lucideArrowRightLeft,
      lucideBanknote,
      lucideChefHat,
      lucideCreditCard,
      lucidePackagePlus,
      lucideMerge,
      lucideTrash2,
      lucideX,
      lucideSquare,
      lucideCheckSquare,
      lucideCheck,
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
  readonly #router = inject(Router);

  protected readonly orderItemDeleting = signal<OrderItem | null>(null);
  protected readonly isCancelingOrderModelOpen = signal(false);
  protected readonly isCheckoutPaymentModelOpen = signal(false);
  protected readonly isPartialPaymentModelOpen = signal(false);
  protected readonly isMoveTableModelOpen = signal(false);
  protected readonly isMergeOrdersModelOpen = signal(false);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly fetchedOrder = signal<Order | null>(null);
  readonly isLoading = signal(false);

  // Local multi-selection state: maps itemId to selected paid and served quantities
  protected readonly selectedItems = signal<Map<string, { paidQty: number; serveQty: number }>>(new Map());

  // Helper computed signals
  protected readonly selectedItemsList = computed(() => {
    const selected = this.selectedItems();
    return Array.from(selected.entries())
      .map(([itemId, qtys]) => {
        const item = this.displayOrderViewModel()?.items.find((i) => i.id === itemId);
        return {
          item,
          itemId,
          ...qtys,
        };
      })
      .filter((x) => !!x.item);
  });

  protected readonly totalSelectedItemsCount = computed(() => this.selectedItems().size);

  protected readonly selectedTotalAmount = computed(() => {
    return this.selectedItemsList().reduce((sum, s) => {
      return sum + s.paidQty * s.item!.priceAtPurchase;
    }, 0);
  });

  protected readonly totalPaidUnitsDiff = computed(() => {
    return this.selectedItemsList().reduce((sum, s) => {
      return sum + Math.abs(s.paidQty);
    }, 0);
  });

  protected readonly totalServeUnitsDiff = computed(() => {
    return this.selectedItemsList().reduce((sum, s) => {
      return sum + Math.abs(s.serveQty);
    }, 0);
  });

  readonly currentOrder = computed(() => {
    const orders = this.#ordersStore.openOrders();
    return orders.find((o) => o.id === this.resolvedOrderId()) ?? null;
  });

  readonly displayOrder = computed(() => this.currentOrder() ?? this.fetchedOrder());

  protected readonly displayOrderViewModel = computed(() => {
    const order = this.displayOrder();
    if (!order) return null;

    const sortedItems = [...order.items].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.id.localeCompare(b.id);
    });

    return {
      ...order,
      items: sortedItems.map((item) => ({
        ...item,
        productName: item.productName ?? item.productId,
      })),
    };
  });

  protected readonly isLoadingServices = this.#ordersStore.list.isLoading;

  #isNavigatingAway = false;

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#ordersStore.setBarId(barId);
      this.#tablesStore.setBarId(barId);
    });

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

  protected isItemSelected(itemId: string): boolean {
    return this.selectedItems().has(itemId);
  }

  protected getSelectedQuantities(itemId: string) {
    return this.selectedItems().get(itemId);
  }

  protected toggleSelectItem(item: OrderItem) {
    const current = new Map(this.selectedItems());
    if (current.has(item.id)) {
      current.delete(item.id);
    } else {
      current.set(item.id, {
        paidQty: 0,
        serveQty: 0,
      });
    }
    this.selectedItems.set(current);
  }

  protected updateSelectedPayQty(itemId: string, qty: number) {
    const current = new Map(this.selectedItems());
    const val = current.get(itemId);
    if (val) {
      current.set(itemId, { ...val, paidQty: qty });
      this.selectedItems.set(current);
    }
  }

  protected updateSelectedServeQty(itemId: string, qty: number) {
    const current = new Map(this.selectedItems());
    const val = current.get(itemId);
    if (val) {
      current.set(itemId, { ...val, serveQty: qty });
      this.selectedItems.set(current);
    }
  }

  protected clearSelection() {
    this.selectedItems.set(new Map());
  }

  protected handleConfirmChanges() {
    if (this.totalPaidUnitsDiff() > 0) {
      this.isPartialPaymentModelOpen.set(true);
    } else {
      this.applySelectedChanges();
    }
  }

  protected async handlePartialPaymentMethod(method: PaymentMethod | undefined) {
    this.isPartialPaymentModelOpen.set(false);
    if (!method) return;
    await this.applySelectedChanges(method);
  }

  protected async applySelectedChanges(paymentMethod?: PaymentMethod) {
    const order = this.displayOrder();
    if (!order) return;

    const itemsToUpdate = this.selectedItemsList()
      .filter((s) => s.paidQty !== 0 || s.serveQty !== 0)
      .map((s) => {
        const update: BulkUpdateItemDto = { itemId: asOrderItemId(s.itemId) };
        if (s.paidQty !== 0) {
          update.paidQuantity = s.item!.paidQuantity + s.paidQty;
          if (s.paidQty > 0 && paymentMethod) {
            update.paymentMethod = paymentMethod;
          }
        }
        if (s.serveQty !== 0) {
          update.servedQuantity = s.item!.servedQuantity + s.serveQty;
        }
        return update;
      });

    if (itemsToUpdate.length === 0) return;

    try {
      this.isLoading.set(true);
      await this.#ordersStore.bulkUpdate(this.barId(), order.id, { items: itemsToUpdate });
      const updated = await this.#ordersStore.getOrder(this.barId(), order.id);
      this.fetchedOrder.set(updated);
      this.clearSelection();
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected handleOpenCheckout() {
    this.isCheckoutPaymentModelOpen.set(true);
  }

  protected async handleCheckoutPaymentMethod(method: PaymentMethod | undefined) {
    this.isCheckoutPaymentModelOpen.set(false);
    if (!method) return;

    const order = this.currentOrder();
    if (!order) {
      return;
    }

    await this.#ordersStore.checkout(this.barId(), order.id, method);
    this.goBack();
    this.#tablesStore.reload();
    this.#ordersStore.reloadHistory();
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
    this.isMoveTableModelOpen.set(true);
  }

  protected async handleMoveTableResult(targetTableId: string | undefined) {
    const order = this.currentOrder();
    if (!order) return;

    if (targetTableId) {
      try {
        await this.#ordersStore.moveTable(this.barId(), order.id, { tableId: asTableId(targetTableId) });
        this.#ordersStore.reloadOrders();
        this.#tablesStore.reload();
      } catch (e) {
        console.error(e);
      }
    }
    this.isMoveTableModelOpen.set(false);
  }

  onMerge() {
    this.isMergeOrdersModelOpen.set(true);
  }

  protected async handleMergeResult(targetOrderId: string | undefined) {
    const order = this.currentOrder();
    if (!order) return;

    if (targetOrderId) {
      try {
        await this.#ordersStore.merge(this.barId(), {
          orderIds: [order.id, asOrderId(targetOrderId)],
        });
        this.#ordersStore.reloadOrders();
        this.#tablesStore.reload();
      } catch (e) {
        console.error(e);
      }
    }
    this.isMergeOrdersModelOpen.set(false);
  }

  protected readonly availableTables = computed(() =>
    this.#tablesStore.tables.hasValue() ? (this.#tablesStore.tables.value() ?? []) : [],
  );

  protected readonly openOrders = this.#ordersStore.openOrders;
}

export default OrderDetail;
