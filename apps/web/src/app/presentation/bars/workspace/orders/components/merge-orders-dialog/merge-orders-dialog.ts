import { Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import type { Order } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-merge-orders-dialog',
  imports: [MatButton, TranslatePipe, PricePipe, MatDialogTitle, MatDialogContent, MatDialogActions],
  template: `
    <h2 mat-dialog-title class="heading-2 m-0 p-0 text-on-surface">{{ 'orders.merge_title' | translate }}</h2>

    <div class="p-6 flex flex-col gap-4 max-w-md">
      <div class="flex flex-col gap-2">
        <p class="text-sm text-on-surface-variant m-0 p-0">{{ 'orders.merge_description' | translate }}</p>
      </div>

      <mat-dialog-content class="flex flex-col gap-2 max-h-[50vh] m-0 p-0 overflow-y-auto mt-2">
        @for (order of otherOrders(); track order.id) {
          <button
            class="w-full flex justify-between items-center px-4 py-3 hover:bg-surface-container-highest rounded-lg transition-colors border border-outline-variant/50"
            (click)="selected.emit(order.id)"
          >
            <span class="font-semibold text-on-surface">{{ order.tableName ?? ('orders.bar_order' | translate) }}</span>
            <span class="font-bold text-primary text-sm">{{ order.totalAmount | price }}</span>
          </button>
        } @empty {
          <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_other_orders' | translate }}</p>
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
export class MergeOrdersDialog {
  readonly orders = input.required<Order[]>();
  readonly currentOrderId = input.required<string>();

  readonly selected = output<string>();
  readonly canceled = output<void>();

  protected readonly otherOrders = computed(() => {
    return this.orders().filter((o) => o.id !== this.currentOrderId());
  });
}
