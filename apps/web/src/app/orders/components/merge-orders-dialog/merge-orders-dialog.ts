import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Order } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../shared';

export interface MergeOrdersDialogData {
  orders: Order[];
  currentOrderId: string;
}

@Component({
  selector: 'coaster-merge-orders-dialog',
  imports: [TranslatePipe, PricePipe],
  template: `
    <div class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-90 w-[90vw] flex flex-col gap-4">
      <h2 class="text-lg font-bold text-on-surface">{{ 'orders.merge_title' | translate }}</h2>
      <p class="text-sm text-on-surface-variant">{{ 'orders.merge_description' | translate }}</p>

      <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        @for (order of otherOrders; track order.id) {
          <button
            class="w-full text-left p-4 rounded-xl bg-surface-container-highest hover:bg-primary/10 transition-colors active:scale-[0.98] flex justify-between items-center"
            (click)="dialogRef.close(order.id)"
          >
            <span class="font-semibold text-on-surface">{{ order.tableName ?? ('orders.bar_order' | translate) }}</span>
            <span class="font-bold text-primary text-sm">{{ order.totalAmount | price }}</span>
          </button>
        } @empty {
          <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_other_orders' | translate }}</p>
        }
      </div>

      <button
        class="px-5 py-2.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-bright transition-colors self-end"
        (click)="dialogRef.close(undefined)"
      >
        {{ 'common.cancel' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MergeOrdersDialog {
  dialogRef = inject(DialogRef<string | undefined>);
  data = inject<MergeOrdersDialogData>(DIALOG_DATA);

  readonly otherOrders = this.data.orders.filter((o) => o.id !== this.data.currentOrderId);
}
