import { Component, computed, effect, inject, input, inputBinding, outputBinding, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import type { BarId, BulkUpdateItemDto, Order, OrderItem, PaymentMethod } from '@coaster/common';
import { asOrderId, asOrderItemId, asTableId } from '@coaster/core';
import { OrdersStore, OrderTitlePipe } from '@coaster/orders';
import { TablesStore } from '@coaster/tables';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../../../components/confirm-dialog/confirm-dialog.component';
import { Loading } from '../../../../../components/loading/loading';
import { MergeOrdersDialog } from './components/merge-orders-dialog/merge-orders-dialog';
import { MoveTableDialog } from './components/move-table-dialog/move-table-dialog';
import { PaymentMethodDialog } from './components/payment-method-dialog/payment-method-dialog';
import { OrderActions } from './components/order-actions/order-actions';
import { OrderSummaryCard } from './components/order-summary-card/order-summary-card';
import { OrderItemCard } from './components/order-item-card/order-item-card';
import { OrderBulkActions } from './components/order-bulk-actions/order-bulk-actions';

@Component({
  selector: 'coaster-order-detail',
  imports: [Loading, MatButton, MatIconButton, TranslatePipe, MatIcon, OrderTitlePipe, OrderActions, OrderSummaryCard, OrderItemCard, OrderBulkActions],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './order-detail.html',
})
class OrderDetail {
  public readonly barId = input.required<BarId>();
  public readonly orderId = input.required<string>();

  readonly #ordersStore = inject(OrdersStore);
  readonly #tablesStore = inject(TablesStore);
  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);

  readonly #translate = inject(TranslateService);

  protected readonly isPrinting = signal(false);
  protected readonly orderItemDeleting = signal<OrderItem | null>(null);
  protected readonly isCancelingOrderModelOpen = signal(false);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly fetchedOrder = signal<Order | null>(null);
  readonly isLoading = signal(false);

  // Local multi-selection state: maps itemId to selected paid quantities
  protected readonly selectedItems = signal<Map<string, { paidQty: number }>>(new Map());

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

  protected clearSelection() {
    this.selectedItems.set(new Map());
  }

  protected handleConfirmChanges() {
    if (this.totalPaidUnitsDiff() > 0) {
      this.#openPaymentMethodDialog(this.selectedTotalAmount()).subscribe((method) => {
        if (method) {
          this.applySelectedChanges(method);
        }
      });
    } else {
      this.applySelectedChanges();
    }
  }

  protected async applySelectedChanges(paymentMethod?: PaymentMethod) {
    const order = this.displayOrder();
    if (!order) return;

    const itemsToUpdate = this.selectedItemsList()
      .filter((s) => s.paidQty !== 0)
      .map((s) => {
        const update: BulkUpdateItemDto = { itemId: asOrderItemId(s.itemId) };
        if (s.paidQty !== 0) {
          update.paidQuantity = s.item!.paidQuantity + s.paidQty;
          if (s.paidQty > 0 && paymentMethod) {
            update.paymentMethod = paymentMethod;
          }
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
    const order = this.currentOrder();
    if (!order) return;

    this.#openPaymentMethodDialog(order.totalAmount).subscribe(async (method) => {
      if (!method) return;

      await this.#ordersStore.checkout(this.barId(), order.id, method);
      this.goBack();
      this.#tablesStore.reload();
      this.#ordersStore.reloadHistory();
    });
  }

  #openPaymentMethodDialog(amount: number) {
    const dialogRef = this.#dialog.open(PaymentMethodDialog, {
      autoFocus: false,
      bindings: [
        inputBinding('amount', () => amount),
        outputBinding('selected', (method) => {
          dialogRef.close(method);
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });
    return dialogRef.afterClosed();
  }

  protected handleCancelOrder() {
    this.isCancelingOrderModelOpen.set(true);
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => true),
        inputBinding('title', () => this.#translate.instant('orders.cancel_title')),
        inputBinding('text', () => this.#translate.instant('orders.cancel_message')),
        outputBinding('canceled', () => {
          this.handleCancelCancelOrderDialog();
          dialogRef.close();
        }),
        outputBinding('deleted', () => {
          this.handleCancelOrderConfirmed();
          dialogRef.close();
        }),
      ],
    });
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
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => true),
        inputBinding('title', () => this.#translate.instant('orders.remove_item_title')),
        inputBinding('text', () => this.#translate.instant('orders.remove_item_message')),
        outputBinding('canceled', () => {
          this.handleCancelRemoveItem();
          dialogRef.close();
        }),
        outputBinding('deleted', () => {
          this.handleRemoveItemConfirmed();
          dialogRef.close();
        }),
      ],
    });
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
    const dialogRef = this.#dialog.open(MoveTableDialog, {
      autoFocus: false,
      bindings: [
        inputBinding('tables', () => this.availableTables()),
        inputBinding('currentTableId', () => this.currentOrder()?.tableId),
        outputBinding('selected', (result: string) => {
          this.handleMoveTableResult(result);
          dialogRef.close();
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });
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
  }

  onMerge() {
    const dialogRef = this.#dialog.open(MergeOrdersDialog, {
      autoFocus: false,
      bindings: [
        inputBinding('orders', () => this.openOrders()),
        inputBinding('currentOrderId', () => this.orderId()),
        outputBinding('selected', (result: string) => {
          this.handleMergeResult(result);
          dialogRef.close();
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });
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
  }

  protected readonly availableTables = computed(() =>
    this.#tablesStore.tables.hasValue() ? (this.#tablesStore.tables.value() ?? []) : [],
  );

  protected readonly openOrders = this.#ordersStore.openOrders;

  async printOrder() {
    const order = this.displayOrderViewModel();
    if (!order) return;

    this.isPrinting.set(true);

    try {
      await this.#ordersStore.printOrder(order);
    } catch {
      // Toast handled in the store
    } finally {
      this.isPrinting.set(false);
    }
  }
}

export default OrderDetail;
