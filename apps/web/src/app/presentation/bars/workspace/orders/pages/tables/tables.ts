import {
  Component,
  computed,
  effect,
  inject,
  input,
  inputBinding,
  linkedSignal,
  outputBinding,
  signal,
} from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatCard } from '@angular/material/card';
import { MatChip } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, Order, Table } from '@coaster/common';
import { ActiveOrdersStore } from '@coaster/orders';
import { TablesStore } from '@coaster/tables';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../../../components/confirm-dialog/confirm-dialog.component';
import { Loading } from '../../../../../components/loading/loading';
import { Fab } from '../../../components/fab/fab';
import { PricePipe } from '../../../pipes/price/price';
import { CreateTableForm } from './components/create-table-form/create-table-form';
import { TableCard } from './components/table-card/table-card';

@Component({
  selector: 'coaster-tables',
  imports: [TableCard, MatCard, Loading, Fab, TranslatePipe, MatIcon, PricePipe, MatChip],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './tables.html',
})
class Tables {
  public readonly barId = input.required<BarId>();

  readonly #tablesStore = inject(TablesStore);
  readonly #activeOrdersStore = inject(ActiveOrdersStore);
  readonly #barsStore = inject(BarsStore);

  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);
  readonly #bottomSheet = inject(MatBottomSheet);

  readonly #translate = inject(TranslateService);

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#tablesStore.setBarId(barId);
      this.#activeOrdersStore.setBarId(barId);
    });
  }

  readonly isSubmitting = signal(false);
  readonly tableToDelete = signal<Table | null>(null);
  readonly isDeletingTableModalOpen = linkedSignal(() => !!this.tableToDelete());

  readonly isOwner = this.#barsStore.isOwner;

  protected readonly freeCount = this.#tablesStore.freeCount;
  protected readonly occupiedCount = this.#tablesStore.occupiedCount;
  protected readonly totalOpen = this.#activeOrdersStore.totalOpen;
  protected readonly isLoadingTables = this.#tablesStore.tables.isLoading;

  protected readonly tablesViewModel = computed(() => {
    if (!this.#tablesStore.tables.hasValue()) return [];
    const tables = this.#tablesStore.tables.value() ?? [];
    const orders = this.#activeOrdersStore.openOrders();

    return tables.map((table) => {
      const order = orders.find((o) => o.tableId === table.id);
      return {
        original: table,
        orderAmount: order?.totalAmount,
      };
    });
  });

  protected readonly barOrdersViewModel = computed(() => this.#activeOrdersStore.openOrders().filter((o) => !o.tableId));

  onBarOrder() {
    this.#router.navigate(['/bars', this.barId(), 'orders', 'new']);
  }

  onTableClicked(table: Table) {
    const order = this.#activeOrdersStore.openOrders().find((o) => o.tableId === table.id);
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
    const bottomSheetRef = this.#bottomSheet.open(CreateTableForm, {
      bindings: [
        inputBinding('isSubmitting', () => this.isSubmitting()),
        outputBinding('created', async (name: string) => {
          this.isSubmitting.set(true);
          try {
            await this.#tablesStore.create({ name });
            bottomSheetRef.dismiss();
          } catch (e) {
            console.error(e);
          }
          this.isSubmitting.set(false);
        }),
      ],
    });
  }

  protected handleDeleteTable(table: Table) {
    this.tableToDelete.set(table);
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => true),
        inputBinding('title', () => this.#translate.instant('orders.delete_table_title')),
        inputBinding('text', () => this.#translate.instant('orders.delete_table_message', { name: table.name })),
        outputBinding('canceled', () => {
          this.handleCloseDeleteTableModal();
          dialogRef.close();
        }),
        outputBinding('deleted', () => {
          this.handleConfirmDeleteTable();
          dialogRef.close();
        }),
      ],
    });
  }

  protected handleCloseDeleteTableModal() {
    this.tableToDelete.set(null);
  }

  protected async handleConfirmDeleteTable() {
    const table = this.tableToDelete();
    if (!table) {
      return;
    }

    try {
      await this.#tablesStore.delete(table.id);
    } catch (error) {
      console.error(error);
    }
    this.tableToDelete.set(null);
  }
}

export default Tables;
