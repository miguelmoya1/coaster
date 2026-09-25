import { asOrderId, asOrderItemId, asTableId } from '@coaster/common';
import { Component, computed, inject, input, inputBinding, linkedSignal, outputBinding, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import type { EstablishmentId, BulkUpdateItemDto, Order, OrderItem, Table } from '@coaster/common';
import { AdjustmentTarget, OrderStatus, PaymentMethod } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { ManageOrder, OrderTitlePipe } from '@coaster/orders';
import { PrintTicket } from '@coaster/printer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../../../components/loading/loading';
import { NoteEditor } from '../../../../../components/note-editor/note-editor';
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
    NoteEditor,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './order-detail.html',
})
class OrderDetail {
  protected readonly OrderStatus = OrderStatus;
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly orderId = input.required<string>();
  public readonly order = input.required<PageResource<Order>>();
  public readonly tables = input.required<PageResource<Table[]>>();
  public readonly openOrders = input.required<PageResource<Order[]>>();

  readonly #manageOrder = inject(ManageOrder);
  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #printTicket = inject(PrintTicket);
  readonly #feedback = inject(ActionFeedback);

  readonly #translate = inject(TranslateService);

  protected readonly isPrinting = signal(false);
  protected readonly isSaving = signal(false);

  readonly resolvedOrderId = computed(() => asOrderId(this.orderId()));

  readonly displayOrder = linkedSignal<Order | undefined>(() => {
    const order = this.order();
    return order.hasValue() ? order.value() : undefined;
  });

  readonly currentOrder = computed(() => {
    const order = this.displayOrder();
    return order?.status === OrderStatus.OPEN ? order : null;
  });

  protected readonly selectedItems = signal<Map<string, { paidQty: number }>>(new Map());

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

  async goBack() {
    await this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'tables']);
  }

  onAddItems() {
    const order = this.currentOrder();
    if (!order) return;
    this.#router.navigate(['/establishments', this.establishmentId(), 'orders', order.id, 'add']);
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
      this.isSaving.set(true);
      await this.#manageOrder.bulkUpdate(this.establishmentId(), order.id, { items: itemsToUpdate });
      this.order().reload();
      this.clearSelection();
    } catch (e) {
      this.#feedback.error(e);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected handleOpenCheckout() {
    const order = this.currentOrder();
    if (!order) return;

    const pendingAmount = Math.max(0, order.payableTotal - (order.amountPaidCash + order.amountPaidCard));
    this.#openPaymentMethodDialog(pendingAmount).subscribe(async (method) => {
      if (!method) return;

      try {
        await this.#manageOrder.checkout(this.establishmentId(), order.id, { paymentMethod: method });
        await this.goBack();
      } catch (e) {
        this.#feedback.error(e);
      }
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

    try {
      await this.#manageOrder.cancel(this.establishmentId(), order.id);
      await this.goBack();
    } catch (e) {
      this.#feedback.error(e);
    }
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

    try {
      await this.#manageOrder.removeItem(this.establishmentId(), order.id, item.id);
      this.order().reload();
    } catch (e) {
      this.#feedback.error(e);
    }
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
        await this.#manageOrder.moveTable(this.establishmentId(), order.id, {
          tableId: asTableId(targetTableId),
        });
        this.order().reload();
      } catch (e) {
        this.#feedback.error(e);
      }
    }
  }

  onMerge() {
    const dialogRef = this.#dialog.open(MergeOrdersDialog, {
      autoFocus: false,
      bindings: [
        inputBinding('orders', () => this.otherOpenOrders()),
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
        await this.#manageOrder.merge(this.establishmentId(), {
          orderIds: [order.id, asOrderId(targetOrderId)],
        });
        this.order().reload();
      } catch (e) {
        this.#feedback.error(e);
      }
    }
  }

  protected readonly availableTables = computed(() => loadedOr(this.tables(), []));

  protected readonly otherOpenOrders = computed(() => loadedOr(this.openOrders(), []));

  async onOrderNotesChanged(notes: string) {
    await this.#optimistically(
      (order) => ({ ...order, notes }),
      () => this.#manageOrder.updateNotes(this.establishmentId(), this.resolvedOrderId(), { notes }),
    );
  }

  async onTicketNotesChanged(ticketNotes: string) {
    await this.#optimistically(
      (order) => ({ ...order, ticketNotes }),
      () => this.#manageOrder.updateNotes(this.establishmentId(), this.resolvedOrderId(), { ticketNotes }),
    );
  }

  async onItemNotesChanged(item: OrderItem, notes: string) {
    await this.#optimistically(
      (order) => ({ ...order, items: order.items.map((i) => (i.id === item.id ? { ...i, notes } : i)) }),
      () => this.#manageOrder.updateItemNotes(this.establishmentId(), this.resolvedOrderId(), item.id, { notes }),
    );
  }

  async #optimistically(change: (order: Order) => Order, save: () => Promise<void>) {
    const before = this.displayOrder();
    if (!before) return;

    this.displayOrder.set(change(before));

    try {
      await save();
    } catch (e) {
      this.displayOrder.set(before);
      this.#feedback.error(e);
    }
  }

  async printOrder() {
    const order = this.displayOrderViewModel();
    if (!order) return;

    this.isPrinting.set(true);

    try {
      await this.#printTicket.execute(order);
    } catch (error) {
      this.#feedback.error(error);
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
    await this.#optimistically(
      (order) => ({ ...order, tipAmount: tipCents, payableTotal: (order.orderTotal ?? order.totalAmount) + tipCents }),
      () => this.#manageOrder.updateTip(this.establishmentId(), this.resolvedOrderId(), { tipAmount: tipCents }),
    );
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
      await this.#manageOrder.addAdjustment(this.establishmentId(), order.id, {
        target: itemId ? AdjustmentTarget.ITEM : AdjustmentTarget.ORDER,
        type: result.type,
        value: result.value,
        reason: result.reason,
        itemId: itemId ? asOrderItemId(itemId) : undefined,
      });
      this.order().reload();
    } catch (e) {
      this.#feedback.error(e);
    }
  }

  async onRemoveAdjustment(adjustmentId: string) {
    const order = this.currentOrder();
    if (!order) return;
    try {
      await this.#manageOrder.removeAdjustment(this.establishmentId(), order.id, adjustmentId);
      this.order().reload();
    } catch (e) {
      this.#feedback.error(e);
    }
  }
}

export default OrderDetail;
