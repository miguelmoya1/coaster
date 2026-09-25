import { Component, computed, inject, input, inputBinding, outputBinding, signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatCard } from '@angular/material/card';
import { MatChip } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import type { EstablishmentId, Order, Table } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { ManageTables, tableCounts } from '@coaster/tables';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { ResourceStatus } from '../../../../../components/resource-status/resource-status';
import { Fab } from '../../../components/fab/fab';
import { PricePipe } from '../../../pipes/price/price';
import { CreateTableForm } from './components/create-table-form/create-table-form';
import { TableCard } from './components/table-card/table-card';

@Component({
  selector: 'coaster-tables',
  imports: [
    TableCard,
    MatCard,
    ResourceStatus,
    Fab,
    TranslatePipe,
    MatIcon,
    PricePipe,
    MatChip,
    RequireSubscriptionDirective,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './tables.html',
})
class Tables {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly tables = input.required<PageResource<Table[]>>();
  public readonly openOrders = input.required<PageResource<Order[]>>();

  readonly #manageTables = inject(ManageTables);
  readonly #myMemberStore = inject(MyMemberStore);

  readonly #router = inject(Router);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #bottomSheet = inject(MatBottomSheet);
  readonly #feedback = inject(ActionFeedback);

  readonly #translate = inject(TranslateService);

  readonly isSubmitting = signal(false);

  readonly isOwner = this.#myMemberStore.isOwner;

  readonly #openOrders = computed(() => loadedOr(this.openOrders(), []));

  protected readonly counts = computed(() => tableCounts(loadedOr(this.tables(), [])));
  protected readonly totalOpen = computed(() => this.#openOrders().length);

  protected readonly tablesViewModel = computed(() =>
    loadedOr(this.tables(), []).map((table) => ({
      original: table,
      orderAmount: this.#openOrders().find((order) => order.tableId === table.id)?.payableTotal,
    })),
  );

  protected readonly barOrdersViewModel = computed(() => this.#openOrders().filter((order) => !order.tableId));

  onBarOrder() {
    this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'new']);
  }

  onTableClicked(table: Table) {
    const order = this.#openOrders().find((o) => o.tableId === table.id);
    if (order) {
      this.#router.navigate(['/establishments', this.establishmentId(), 'orders', order.id]);
    } else {
      this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'new', table.id]);
    }
  }

  onBarOrderClicked(order: Order) {
    this.#router.navigate(['/establishments', this.establishmentId(), 'orders', order.id]);
  }

  onCreateTable() {
    const bottomSheetRef = this.#bottomSheet.open(CreateTableForm, {
      bindings: [
        inputBinding('isSubmitting', () => this.isSubmitting()),
        outputBinding('created', async (name: string) => {
          this.isSubmitting.set(true);
          try {
            await this.#manageTables.create(this.establishmentId(), { name });
            this.tables().reload();
            bottomSheetRef.dismiss();
          } catch (e) {
            this.#feedback.error(e);
          }
          this.isSubmitting.set(false);
        }),
      ],
    });
  }

  protected async handleDeleteTable(table: Table) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('orders.delete_table_title'),
      text: this.#translate.instant('orders.delete_table_message', { name: table.name }),
    });

    if (!confirmed) return;

    try {
      await this.#manageTables.delete(this.establishmentId(), table.id);
      this.tables().reload();
    } catch (error) {
      this.#feedback.error(error);
    }
  }
}

export default Tables;
