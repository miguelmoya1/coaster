import { Component, computed, effect, inject, input, inputBinding, outputBinding, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import type { BarId, BulkUpdateItemDto, Order, OrderItem } from '@coaster/common';
import { AdjustmentTarget, OrderStatus, PaymentMethod } from '@coaster/common';
import { ActionFeedback, asOrderId, asOrderItemId, asTableId } from '@coaster/core';
import { ActiveOrdersStore, OrderHistoryStore, OrderTitlePipe } from '@coaster/orders';
import { PrintTicket } from '@coaster/printer';
import { TablesStore } from '@coaster/tables';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../../../components/loading/loading';
import { AddAdjustmentDialog, AddAdjustmentResult } from './components/add-adjustment-dialog/add-adjustment-dialog';
import { MergeOrdersDialog } from './components/merge-orders-dialog/merge-orders-dialog';
import { MoveTableDialog } from './components/move-table-dialog/move-table-dialog';
import { OrderActions } from './components/order-actions/order-actions';
import { OrderBulkActions } from './components/order-bulk-actions/order-bulk-actions';
import { OrderItemCard } from './components/order-item-card/order-item-card';
import { OrderSummaryCard } from './components/order-summary-card/order-summary-card';
import { PaymentMethodDialog } from './components/payment-method-dialog/payment-method-dialog';
import { UpdateTipDialog } from './components/update-tip-dialog/update-tip-dialog';

@Component({
  selector: 'coaster-order-detail',
  imports: [
    Loading,
    MatButton,
    MatIconButton,
    TranslatePipe,
    MatIcon,
    OrderTitlePipe,
    OrderActions,
    OrderSummaryCard,
    OrderItemCard,
    OrderBulkActions,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './order-detail.html',
})
class OrderDetail {
  protected readonly OrderStatus = OrderStatus;
  public readonly barId = input.required<BarId>();
  public readonly orderId = input.required<string>();

  readonly #activeOrdersStore = inject(ActiveOrdersStore);
  readonly #orderHistoryStore = inject(OrderHistoryStore);
  readonly #tablesStore = inject(TablesStore);
  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #printTicket = inject(PrintTicket);
  readonly #feedback = inject(ActionFeedback);

  readonly #translate = inject(TranslateService);

  protected readonly isPrinting = signal(false);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly fetchedOrder = signal<Order | null>(null);
  readonly isLoading = signal(false);
  #loadRequest = 0;

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
    const orders = this.#activeOrdersStore.openOrders();
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

  protected readonly isLoadingServices = this.#activeOrdersStore.list.isLoading;

  #isNavigatingAway = false;

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#activeOrdersStore.setBarId(barId);
      this.#orderHistoryStore.setBarId(barId);
      this.#tablesStore.setBarId(barId);
    });

    effect(() => {
      if (this.#isNavigatingAway) return;
      const current = this.currentOrder();
      const request = ++this.#loadRequest;

      if (!current) {
        void this.loadOrder(request);
      } else {
        this.fetchedOrder.set(null);
        this.isLoading.set(false);
      }
    });
  }

  private async loadOrder(request: number) {
    this.isLoading.set(true);
    try {
      const order = await this.#activeOrdersStore.getOrder(this.barId(), this.resolvedOrderId());
      if (request === this.#loadRequest) {
        this.fetchedOrder.set(order);
      }
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      if (request === this.#loadRequest) {
        this.isLoading.set(false);
      }
    }
  }

  async goBack() {
    this.#isNavigatingAway = true;
    await this.#router.navigate(['/app/bars', this.barId(), 'orders', 'tables']);
  }

  onAddItems() {
    const order = this.currentOrder();
    if (!order) return;
    this.#router.navigate(['/app/bars', this.barId(), 'orders', order.id, 'add']);
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
      await this.#activeOrdersStore.bulkUpdate(this.barId(), order.id, { items: itemsToUpdate });
      const updated = await this.#activeOrdersStore.getOrder(this.barId(), order.id);
      this.fetchedOrder.set(updated);
      this.clearSelection();
    } catch (e) {
      this.#feedback.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected handleOpenCheckout() {
    const order = this.currentOrder();
    if (!order) return;

    const pendingAmount = Math.max(0, order.payableTotal - (order.amountPaidCash + order.amountPaidCard));
    this.#openPaymentMethodDialog(pendingAmount).subscribe(async (method) => {
      if (!method) return;

      await this.#activeOrdersStore.checkout(this.barId(), order.id, method);
      this.goBack();
      this.#tablesStore.reload();
      this.#orderHistoryStore.reloadHistory();
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

  protected async handleCancelOrder() {
    const order = this.currentOrder();
    if (!order) return;

    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('orders.cancel_title'),
      text: this.#translate.instant('orders.cancel_message'),
    });

    if (!confirmed) return;

    await this.#activeOrdersStore.cancel(this.barId(), order.id);
    this.goBack();
    this.#tablesStore.reload();
    this.#orderHistoryStore.reloadHistory();
  }

  protected async handleRemoveItem(item: OrderItem) {
    const order = this.currentOrder();
    if (!order) return;

    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('orders.remove_item_title'),
      text: this.#translate.instant('orders.remove_item_message'),
    });

    if (!confirmed) return;

    await this.#activeOrdersStore.removeItem(this.barId(), order.id, item.id);
    this.#tablesStore.reload();
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
        await this.#activeOrdersStore.moveTable(this.barId(), order.id, { tableId: asTableId(targetTableId) });
        this.#activeOrdersStore.reloadOrders();
        this.#tablesStore.reload();
      } catch (e) {
        this.#feedback.error(e);
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
        await this.#activeOrdersStore.merge(this.barId(), {
          orderIds: [order.id, asOrderId(targetOrderId)],
        });
        this.#activeOrdersStore.reloadOrders();
        this.#tablesStore.reload();
      } catch (e) {
        this.#feedback.error(e);
      }
    }
  }

  protected readonly availableTables = computed(() =>
    this.#tablesStore.tables.hasValue() ? (this.#tablesStore.tables.value() ?? []) : [],
  );

  protected readonly openOrders = this.#activeOrdersStore.openOrders;

  async printOrder() {
    const order = this.displayOrderViewModel();
    if (!order) return;

    this.isPrinting.set(true);

    try {
      await this.#printTicket.execute(order);
    } finally {
      this.isPrinting.set(false);
    }
  }

  onUpdateTip(currentTipAmount: number) {
    const dialogRef = this.#dialog.open(UpdateTipDialog, {
      autoFocus: false,
      bindings: [
        inputBinding('currentTipAmount', () => currentTipAmount),
        outputBinding('confirmed', (tipCents: number) => {
          this.handleUpdateTipResult(tipCents);
          dialogRef.close();
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });
  }

  protected async handleUpdateTipResult(tipCents: number) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#activeOrdersStore.updateTip(this.barId(), order.id, tipCents);
    } catch (e) {
      this.#feedback.error(e);
    }
  }

  onAddAdjustment(itemId?: string) {
    const dialogRef = this.#dialog.open(AddAdjustmentDialog, {
      autoFocus: false,
      bindings: [
        outputBinding('confirmed', (result: AddAdjustmentResult) => {
          this.handleAddAdjustmentResult(result, itemId);
          dialogRef.close();
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });
  }

  protected async handleAddAdjustmentResult(result: AddAdjustmentResult, itemId?: string) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#activeOrdersStore.addAdjustment(this.barId(), order.id, {
        target: itemId ? AdjustmentTarget.ITEM : AdjustmentTarget.ORDER,
        type: result.type,
        value: result.value,
        reason: result.reason,
        itemId: itemId ? asOrderItemId(itemId) : undefined,
      });
      const updated = await this.#activeOrdersStore.getOrder(this.barId(), order.id);
      this.fetchedOrder.set(updated);
    } catch (e) {
      this.#feedback.error(e);
    }
  }

  async onRemoveAdjustment(adjustmentId: string) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#activeOrdersStore.removeAdjustment(this.barId(), order.id, adjustmentId);
      const updated = await this.#activeOrdersStore.getOrder(this.barId(), order.id);
      this.fetchedOrder.set(updated);
    } catch (e) {
      this.#feedback.error(e);
    }
  }
}

export default OrderDetail;
