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
import type { Order } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../pipes/price/price';

export interface MergeOrdersDialogData {
  orders: Order[];
  currentOrderId: string;
}

@Component({
  selector: 'coaster-merge-orders-dialog',
  imports: [MatButton, TranslatePipe, PricePipe, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  template: `
    <div class="p-6 flex flex-col gap-4 max-w-md">
      <div class="flex flex-col gap-2">
        <h2 mat-dialog-title class="heading-2 m-0 p-0 text-on-surface">{{ 'orders.merge_title' | translate }}</h2>
        <p class="text-sm text-on-surface-variant m-0 p-0">{{ 'orders.merge_description' | translate }}</p>
      </div>

      <mat-dialog-content class="flex flex-col gap-2 max-h-[50vh] m-0 p-0 overflow-y-auto">
        @for (order of otherOrders; track order.id) {
          <button
            class="w-full flex justify-between items-center px-4 py-3 hover:bg-surface-container-highest rounded-lg transition-colors border border-outline-variant/50"
            (click)="select(order.id)"
          >
            <span class="font-semibold text-on-surface">{{ order.tableName ?? ('orders.bar_order' | translate) }}</span>
            <span class="font-bold text-primary text-sm">{{ order.totalAmount | price }}</span>
          </button>
        } @empty {
          <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_other_orders' | translate }}</p>
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
export class MergeOrdersDialog {
  private readonly dialogRef = inject(MatDialogRef<MergeOrdersDialog>);
  private readonly data = inject<MergeOrdersDialogData>(MAT_DIALOG_DATA);

  protected readonly otherOrders = this.data.orders.filter((o) => o.id !== this.data.currentOrderId);

  protected select(orderId: string) {
    this.dialogRef.close(orderId);
  }
}
