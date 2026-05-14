import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BarId, Order, Table } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCoffee, lucidePlus } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentUser } from '../../../../../core';
import { MembersStore } from '../../../../../members';
import { OrdersStore } from '../../../../../orders';
import {
  BottomSheet,
  CoasterBtn,
  CoasterTitle,
  ConfirmDialogComponent,
  Fab,
  Loading,
  PricePipe,
  StatusCard,
} from '../../../../../shared';
import { BarTables, CreateTable, DeleteTable, TableCard } from '../../../../../tables';

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
    ConfirmDialogComponent,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideCoffee })],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './tables.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Tables {
  public readonly barId = input.required<BarId>();

  readonly #tablesService = inject(BarTables);
  readonly #ordersStore = inject(OrdersStore);
  readonly #createTable = inject(CreateTable);
  readonly #deleteTable = inject(DeleteTable);
  readonly #currentUser = inject(CurrentUser);
  readonly #membersStore = inject(MembersStore);

  readonly #router = inject(Router);

  readonly showCreateTable = signal(false);
  readonly isSubmitting = signal(false);
  readonly tableToDelete = signal<Table | null>(null);
  readonly isDeletingTableModalOpen = linkedSignal(() => !!this.tableToDelete());

  readonly isOwner = computed(() => {
    if (!this.#membersStore.list.hasValue() || !this.#currentUser.current.hasValue()) return false;
    const members = this.#membersStore.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  protected readonly freeCount = this.#tablesService.freeCount;
  protected readonly occupiedCount = this.#tablesService.occupiedCount;
  protected readonly totalOpen = this.#ordersStore.totalOpen;
  protected readonly isLoadingTables = this.#tablesService.all.isLoading;

  protected readonly tablesViewModel = computed(() => {
    if (!this.#tablesService.all.hasValue()) return [];
    const tables = this.#tablesService.all.value() ?? [];
    const orders = this.#ordersStore.openOrders();

    return tables.map((table) => {
      const order = orders.find((o) => o.tableId === table.id);
      return {
        original: table,
        orderAmount: order?.totalAmount,
      };
    });
  });

  protected readonly barOrdersViewModel = computed(() => this.#ordersStore.openOrders().filter((o) => !o.tableId));

  onBarOrder() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'new']);
  }

  onTableClicked(table: Table) {
    const order = this.#ordersStore.openOrders().find((o) => o.tableId === table.id);
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

  protected handleDeleteTable(table: Table) {
    this.tableToDelete.set(table);
  }

  protected handleCloseDeleteTableModal() {
    this.tableToDelete.set(null);
  }

  protected async handleConfirmDeleteTable() {
    const table = this.tableToDelete();
    if (!table) {
      return;
    }

    await this.#deleteTable.delete(this.barId(), table.id);
    this.#tablesService.reload();
    this.tableToDelete.set(null);
  }
}

export default Tables;
