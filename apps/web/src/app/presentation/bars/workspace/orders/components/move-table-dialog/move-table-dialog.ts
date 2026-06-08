import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import type { Table } from '@coaster/common';
import { TableStatus } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface MoveTableDialogData {
  tables: Table[];
  currentTableId?: string;
}

@Component({
  selector: 'coaster-move-table-dialog',
  imports: [MatButton, TranslatePipe, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  template: `
    <div class="p-6 flex flex-col gap-4 max-w-md">
      <h2 mat-dialog-title class="heading-2 m-0 p-0 text-on-surface">{{ 'orders.move_table_title' | translate }}</h2>

      <mat-dialog-content class="flex flex-col gap-2 max-h-[50vh] m-0 p-0 overflow-y-auto">
        @for (table of freeTables; track table.id) {
          <button
            class="w-full text-left px-4 py-3 hover:bg-surface-container-highest rounded-lg transition-colors border border-outline-variant/50"
            (click)="select(table.id)"
          >
            {{ table.name }}
          </button>
        } @empty {
          <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_free_tables' | translate }}</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="flex justify-end p-0 border-none mt-2">
        <button mat-stroked-button mat-dialog-close>
          {{ 'common.cancel' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class MoveTableDialog {
  private readonly dialogRef = inject(MatDialogRef<MoveTableDialog>);
  private readonly data = inject<MoveTableDialogData>(MAT_DIALOG_DATA);

  protected readonly freeTables = this.data.tables.filter(
    (t) => t.status === TableStatus.FREE && t.id !== this.data.currentTableId,
  );

  protected select(tableId: string) {
    this.dialogRef.close(tableId);
  }
}
