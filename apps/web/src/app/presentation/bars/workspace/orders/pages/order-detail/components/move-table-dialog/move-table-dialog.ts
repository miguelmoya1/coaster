import { Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import type { Table } from '@coaster/common';
import { TableStatus } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-move-table-dialog',
  imports: [MatButton, TranslatePipe, MatDialogTitle, MatDialogContent, MatDialogActions],
  template: `
    <h2 mat-dialog-title class="heading-2 m-0 p-0 text-on-surface">{{ 'orders.move_table_title' | translate }}</h2>

    <div class="p-6 flex flex-col gap-4 max-w-md">
      <mat-dialog-content class="flex flex-col gap-2 max-h-[50vh] m-0 p-0 overflow-y-auto mt-2">
        @for (table of freeTables(); track table.id) {
          <button
            class="w-full text-left px-4 py-3 hover:bg-surface-container-highest rounded-lg transition-colors border border-outline-variant/50"
            (click)="selected.emit(table.id)"
          >
            {{ table.name }}
          </button>
        } @empty {
          <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_free_tables' | translate }}</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="flex justify-end gap-3 p-0 border-none mt-2">
        <button mat-button (click)="canceled.emit()">
          {{ 'common.cancel' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class MoveTableDialog {
  readonly tables = input.required<Table[]>();
  readonly currentTableId = input<string | undefined>();

  readonly selected = output<string>();
  readonly canceled = output<void>();

  protected readonly freeTables = computed(() => {
    return this.tables().filter((t) => t.status === TableStatus.FREE && t.id !== this.currentTableId());
  });
}
