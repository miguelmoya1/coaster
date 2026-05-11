import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
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
import { PricePipe } from '../../../../../shared';

@Component({
  selector: 'coaster-tables',
  imports: [
    TableCard,
    StatusCard,
    Loading,
    CoasterTitle,
    BottomSheet,
    Fab,
    TranslatePipe,
    CoasterBtn,
    NgIcon,
    PricePipe,
    RouterLink,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideCoffee })],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './tables.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Tables {
  public readonly barId = input.required<BarId>();

  readonly #tablesService = inject(BarTables);
  readonly #ordersService = inject(BarOrders);
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
    if (!this.#barMembers.list.hasValue() || !this.#currentUser.current.hasValue()) return false;
    const members = this.#barMembers.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  protected readonly freeCount = this.#tablesService.freeCount;
  protected readonly occupiedCount = this.#tablesService.occupiedCount;
  protected readonly totalOpen = this.#ordersService.totalOpen;
  protected readonly isLoadingTables = this.#tablesService.all.isLoading;

  protected readonly tablesViewModel = computed(() => {
    if (!this.#tablesService.all.hasValue()) return [];
    const tables = this.#tablesService.all.value() ?? [];
    const orders = this.#ordersService.openOrders();

    return tables.map((table) => {
      const order = orders.find((o) => o.tableId === table.id);
      return {
        original: table,
        orderAmount: order?.totalAmount,
      };
    });
  });

  protected readonly barOrdersViewModel = computed(() =>
    this.#ordersService.openOrders().filter((o) => !o.tableId),
  );

  onBarOrder() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'new']);
  }

  onTableClicked(table: Table) {
    const order = this.#ordersService.openOrders().find((o) => o.tableId === table.id);
    if (order) {
      this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
    } else {
      this.#router.navigate(['/bars', this.barId(), 'orders', 'new', table.id]);
    }
  }

  onBarOrderClicked(order: Order) {
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
  }



  onCreateTable() {
    this.showCreateTable.set(true);
  }

  async submitCreateTable(name: string) {
    if (!name.trim()) return;
    this.isSubmitting.set(true);
    try {
      await this.#createTable.create(this.barId(), { name: name.trim() });
      this.#tablesService.reload();
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
          this.#tablesService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default Tables;
