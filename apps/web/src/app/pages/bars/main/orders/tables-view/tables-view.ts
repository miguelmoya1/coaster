import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BarId, Order, OrderItemId, Table, TableStatus } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCoffee, lucidePlus } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';
import { BarOrders, ManageOrder, MoveTableDialog, MoveTableDialogData } from '../../../../../orders';
import {
  MergeOrdersDialog,
  MergeOrdersDialogData,
} from '../../../../../orders/components/merge-orders-dialog/merge-orders-dialog';
import { OrderDetailSheet } from '../../../../../orders/components/order-detail-sheet/order-detail-sheet';
import {
  BottomSheet,
  CoasterBtn,
  CoasterTitle,
  ConfirmDialogComponent,
  Fab,
  Loading,
  StatusCard,
} from '../../../../../shared';
import { BarTables, CreateTable, DeleteTable, TableCard } from '../../../../../tables';

@Component({
  selector: 'coaster-tables-view',
  imports: [TableCard, StatusCard, Loading, CoasterTitle, BottomSheet, OrderDetailSheet, Fab, TranslatePipe, CoasterBtn, NgIcon],
  viewProviders: [provideIcons({ lucidePlus, lucideCoffee })],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex gap-4 mb-2">
      <coaster-status-card class="flex-1" status="success">
        <div class="text-sm text-on-surface-variant font-medium mb-1">{{ 'orders.free_tables' | translate }}</div>
        <div class="text-3xl font-bold text-on-surface">{{ tablesService.freeCount() ?? 0 }}</div>
      </coaster-status-card>

      <coaster-status-card class="flex-1" status="error">
        <div class="text-sm text-on-surface-variant font-medium mb-1">{{ 'orders.occupied_tables' | translate }}</div>
        <div class="text-3xl font-bold text-on-surface">{{ tablesService.occupiedCount() ?? 0 }}</div>
      </coaster-status-card>

      <coaster-status-card class="flex-1" status="primary">
        <div class="text-sm text-on-surface-variant font-medium mb-1">{{ 'orders.open_orders' | translate }}</div>
        <div class="text-3xl font-bold text-on-surface">{{ ordersService.totalOpen() }}</div>
      </coaster-status-card>
    </div>

    <h2 coaster-title>{{ 'orders.tables_title' | translate }}</h2>

    @if (tablesService.all.isLoading()) {
      <coaster-loading />
    }

    <div class="grid grid-cols-3 gap-3 pb-24">
      <!-- "Sin mesa" card — bar order -->
      <button
        class="w-full rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer border-2 min-h-[120px] bg-primary/10 border-primary/40 text-primary"
        (click)="onBarOrder()"
      >
        <ng-icon name="lucideCoffee" class="text-2xl" />
        <span class="font-bold text-base leading-tight text-center">{{ 'orders.bar_order' | translate }}</span>
        <span class="text-xs font-semibold uppercase tracking-wider">{{ 'orders.no_table' | translate }}</span>
      </button>

      @for (table of tablesService.all.value() ?? []; track table.id) {
        <coaster-table-card
          [table]="table"
          [orderAmount]="getOrderAmountForTable(table.id)"
          [deletable]="isOwner()"
          (cardClicked)="onTableClicked($event)"
          (deleteClicked)="onDeleteTable($event)"
        />
      } @empty {
        @if (!tablesService.all.isLoading()) {
          <div class="col-span-2 text-center text-on-surface-variant py-8">
            {{ 'orders.no_tables' | translate }}
          </div>
        }
      }
    </div>

    @if (isOwner()) {
      <coaster-fab (click)="onCreateTable()" />
    }

    @if (selectedOrder()) {
      <coaster-bottom-sheet (closed)="closeSheet()">
        <coaster-order-detail-sheet
          [order]="selectedOrder()!"
          (addItemsClicked)="onAddItems()"
          (checkoutClicked)="onCheckout()"
          (moveTableClicked)="onMoveTable()"
          (mergeClicked)="onMerge()"
          (cancelClicked)="onCancel()"
          (payItemClicked)="onPayItem($event)"
          (deliverItemClicked)="onDeliverItem($event)"
        />
      </coaster-bottom-sheet>
    }

    @if (showCreateTable()) {
      <coaster-bottom-sheet (closed)="showCreateTable.set(false)">
        <div class="flex flex-col gap-4 px-2 pb-4">
          <h3 class="text-lg font-bold text-on-surface">{{ 'orders.create_table' | translate }}</h3>
          <input
            #tableNameInput
            type="text"
            class="w-full rounded-xl bg-surface-container-highest text-on-surface p-4 text-sm border border-outline-variant/30 outline-none focus:border-primary"
            [placeholder]="'orders.table_name_placeholder' | translate"
          />
          <button coaster-btn [disabled]="isSubmitting()" (click)="submitCreateTable(tableNameInput.value)">
            {{ 'common.create' | translate }}
          </button>
        </div>
      </coaster-bottom-sheet>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TablesView {
  public readonly barId = input.required<BarId>();

  readonly tablesService = inject(BarTables);
  readonly ordersService = inject(BarOrders);
  readonly #manageOrder = inject(ManageOrder);
  readonly #createTable = inject(CreateTable);
  readonly #deleteTable = inject(DeleteTable);
  readonly #currentUser = inject(CurrentUser);
  readonly #barMembers = inject(BarMembers);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly selectedOrder = signal<Order | null>(null);
  readonly showCreateTable = signal(false);
  readonly isSubmitting = signal(false);

  readonly isOwner = computed(() => {
    const members = this.#barMembers.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.tablesService.setBarContext(barId);
      this.ordersService.setBarContext(barId);
      this.#barMembers.setBarContext(barId);
    });
  }

  getOrderAmountForTable(tableId: string): number | undefined {
    const order = this.ordersService.openOrders().find((o) => o.tableId === tableId);
    return order?.totalAmount;
  }

  /** Bar order — no table */
  onBarOrder() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'pos']);
  }

  onTableClicked(table: Table) {
    if (table.status === TableStatus.OCCUPIED) {
      // Occupied → open order detail bottom sheet
      const order = this.ordersService.openOrders().find((o) => o.tableId === table.id);
      if (order) {
        this.selectedOrder.set(order);
      }
    } else {
      // Free → go directly to POS with this table pre-selected
      this.#router.navigate(['/bars', this.barId(), 'orders', 'pos'], {
        queryParams: { tableId: table.id },
      });
    }
  }

  closeSheet() {
    this.selectedOrder.set(null);
  }

  onCreateTable() {
    this.showCreateTable.set(true);
  }

  async submitCreateTable(name: string) {
    if (!name.trim()) return;
    this.isSubmitting.set(true);
    try {
      await this.#createTable.create(this.barId(), { name: name.trim() });
      this.tablesService.reload();
      this.showCreateTable.set(false);
    } catch (e) {
      console.error(e);
    }
    this.isSubmitting.set(false);
  }

  async onDeleteTable(table: Table) {
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('orders.delete_table_title'),
        message: this.#translate.instant('orders.delete_table_message', { name: table.name }),
        confirmText: 'common.delete',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#deleteTable.delete(this.barId(), table.id);
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  async onPayItem(itemId: OrderItemId) {
    const order = this.selectedOrder();
    if (!order) return;
    try {
      const updated = await this.#manageOrder.payItem(this.barId(), order.id, itemId);
      this.selectedOrder.set(updated);
      this.ordersService.reload();
    } catch (e) {
      console.error(e);
    }
  }

  async onDeliverItem(itemId: OrderItemId) {
    const order = this.selectedOrder();
    if (!order) return;
    try {
      const updated = await this.#manageOrder.deliverItem(this.barId(), order.id, itemId);
      this.selectedOrder.set(updated);
      this.ordersService.reload();
    } catch (e) {
      console.error(e);
    }
  }

  async onCheckout() {
    const order = this.selectedOrder();
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
          this.closeSheet();
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  async onCancel() {
    const order = this.selectedOrder();
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
          this.closeSheet();
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  /** Navigate to POS to add more items to the existing order */
  onAddItems() {
    const order = this.selectedOrder();
    if (!order) return;
    this.closeSheet();
    this.#router.navigate(['/bars', this.barId(), 'orders', 'pos'], {
      queryParams: { orderId: order.id, tableId: order.tableId },
    });
  }

  onMoveTable() {
    const order = this.selectedOrder();
    if (!order) return;

    const dialogRef = this.#dialog.open(MoveTableDialog, {
      data: {
        tables: this.tablesService.all.value() ?? [],
        currentTableId: order.tableId,
      } satisfies MoveTableDialogData,
    });

    dialogRef.closed.subscribe(async (result) => {
      const tableId = result as string | undefined;
      if (tableId) {
        try {
          await this.#manageOrder.moveTable(this.barId(), order.id, { tableId });
          this.closeSheet();
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  onMerge() {
    const order = this.selectedOrder();
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
          this.closeSheet();
          this.ordersService.reload();
          this.tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}
