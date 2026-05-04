import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BarId, Order, Table } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCoffee, lucidePlus } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';
import { BarOrders } from '../../../../../orders';
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
  selector: 'coaster-tables',
  imports: [TableCard, StatusCard, Loading, CoasterTitle, BottomSheet, Fab, TranslatePipe, CoasterBtn, NgIcon, RouterLink],
  viewProviders: [provideIcons({ lucidePlus, lucideCoffee })],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex bg-surface-container rounded-2xl p-1 gap-1">
      <div
        class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary"
      >
        {{ 'orders.tables_title' | translate }}
      </div>
      <a
        class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        [routerLink]="['/bars', barId(), 'orders', 'history']"
      >
        {{ 'history.title' | translate }}
      </a>
    </div>

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

    @if (barOrders().length > 0) {
      <h2 coaster-title>{{ 'orders.bar_orders' | translate }}</h2>

      <div class="flex flex-col gap-2 pb-24">
        @for (order of barOrders(); track order.id) {
          <button
            class="w-full bg-surface-container rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer hover:bg-surface-container-high"
            (click)="onBarOrderClicked(order)"
          >
            <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ng-icon name="lucideCoffee" size="20" />
            </div>
            <div class="flex-1 flex flex-col gap-0.5 text-left">
              <span class="font-semibold text-on-surface text-sm">{{ 'orders.bar_order' | translate }}</span>
              <span class="text-xs text-on-surface-variant">{{ order.items.length }} {{ 'history.items' | translate }}</span>
            </div>
            <span class="text-lg font-black text-primary">{{ formatPrice(order.totalAmount) }}</span>
          </button>
        }
      </div>
    }

    @if (isOwner()) {
      <coaster-fab (click)="onCreateTable()" />
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
class Tables {
  public readonly barId = input.required<BarId>();

  readonly tablesService = inject(BarTables);
  readonly ordersService = inject(BarOrders);
  readonly #createTable = inject(CreateTable);
  readonly #deleteTable = inject(DeleteTable);
  readonly #currentUser = inject(CurrentUser);
  readonly #barMembers = inject(BarMembers);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly showCreateTable = signal(false);
  readonly isSubmitting = signal(false);

  readonly isOwner = computed(() => {
    const members = this.#barMembers.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  readonly barOrders = computed(() => {
    return this.ordersService.openOrders().filter((o) => !o.tableId);
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

  onBarOrder() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'new']);
  }

  onTableClicked(table: Table) {
    const order = this.ordersService.openOrders().find((o) => o.tableId === table.id);
    if (order) {
      this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
    } else {
      this.#router.navigate(['/bars', this.barId(), 'orders', 'new', table.id]);
    }
  }

  onBarOrderClicked(order: Order) {
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
  }

  formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' €';
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
}

export default Tables;
