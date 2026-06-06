import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { Table } from '@coaster/common';
import { TableStatus } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogComponent } from '../../../components/dialog/dialog.component';

@Component({
  selector: 'coaster-move-table-dialog',
  imports: [MatButtonModule, TranslatePipe, DialogComponent],
  template: `
    <coaster-dialog [isOpen]="isOpen()" (closed)="close()">
      <div class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-90 w-[90vw] flex flex-col gap-4">
        <h2 class="text-lg font-bold text-on-surface">{{ 'orders.move_table_title' | translate }}</h2>

        <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          @for (table of freeTables(); track table.id) {
            <button
              class="w-full"
              (click)="select(table.id)"
            >
              {{ table.name }}
            </button>
          } @empty {
            <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_free_tables' | translate }}</p>
          }
        </div>

        <button mat-button
          class="self-end"
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
