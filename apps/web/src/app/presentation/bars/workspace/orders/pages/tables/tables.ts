import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, Order, Table } from '@coaster/common';
import { OrdersStore } from '@coaster/orders';
import { TablesStore } from '@coaster/tables';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCoffee, lucidePlus } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { Loading } from '../../../../../components/loading/loading';
import { StatusCard } from '../../../../../components/status-card/status-card';
import { CoasterTitle } from '../../../../../components/typography/typography';
import { BottomSheet } from '../../../components/bottom-sheet/bottom-sheet';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Fab } from '../../../components/fab/fab';
import { PricePipe } from '../../../pipes/price/price';
import { TableCard } from './components/table-card/table-card';

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
    MatButton,
    NgIcon,
    PricePipe,
    ConfirmDialogComponent,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideCoffee })],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './tables.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Tables {
  public readonly barId = input.required<BarId>();

  readonly #tablesStore = inject(TablesStore);
  readonly #ordersStore = inject(OrdersStore);
  readonly #barsStore = inject(BarsStore);

  readonly #router = inject(Router);

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#tablesStore.setBarId(barId);
      this.#ordersStore.setBarId(barId);
    });
  }

  readonly showCreateTable = signal(false);
  readonly isSubmitting = signal(false);
  readonly tableToDelete = signal<Table | null>(null);
  readonly isDeletingTableModalOpen = linkedSignal(() => !!this.tableToDelete());

  readonly isOwner = this.#barsStore.isOwner;

  protected readonly freeCount = this.#tablesStore.freeCount;
  protected readonly occupiedCount = this.#tablesStore.occupiedCount;
  protected readonly totalOpen = this.#ordersStore.totalOpen;
  protected readonly isLoadingTables = this.#tablesStore.tables.isLoading;

  protected readonly tablesViewModel = computed(() => {
    if (!this.#tablesStore.tables.hasValue()) return [];
    const tables = this.#tablesStore.tables.value() ?? [];
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
      await this.#tablesStore.create({ name: name.trim() });
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

    await this.#tablesStore.delete(table.id);
    this.tableToDelete.set(null);
  }
}

export default Tables;
