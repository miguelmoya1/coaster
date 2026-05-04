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
  templateUrl: './tables.html',
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
