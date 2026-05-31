import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Table, TableStatus } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogComponent } from '../../../components/dialog/dialog.component';

@Component({
  selector: 'coaster-move-table-dialog',
  imports: [TranslatePipe, DialogComponent],
  template: `
    <coaster-dialog [isOpen]="isOpen()" (closed)="close()">
      <div class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-90 w-[90vw] flex flex-col gap-4">
        <h2 class="text-lg font-bold text-on-surface">{{ 'orders.move_table_title' | translate }}</h2>

        <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          @for (table of freeTables(); track table.id) {
            <button
              class="w-full text-left p-4 rounded-xl bg-surface-container-highest hover:bg-secondary/10 transition-colors active:scale-[0.98] font-semibold text-on-surface"
              (click)="select(table.id)"
            >
              {{ table.name }}
            </button>
          } @empty {
            <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_free_tables' | translate }}</p>
          }
        </div>

        <button
          class="px-5 py-2.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-bright transition-colors self-end"
          (click)="close()"
        >
          {{ 'common.cancel' | translate }}
        </button>
      </div>
    </coaster-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveTableDialog {
  public readonly tables = input.required<Table[]>();
  public readonly currentTableId = input<string>();
  public readonly isOpen = input.required<boolean>();

  public readonly closed = output<string | undefined>();

  protected readonly freeTables = computed(() =>
    this.tables().filter((t) => t.status === TableStatus.FREE && t.id !== this.currentTableId()),
  );

  protected select(tableId: string) {
    this.closed.emit(tableId);
  }

  protected close() {
    this.closed.emit(undefined);
  }
}
