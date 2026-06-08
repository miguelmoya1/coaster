import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { Order } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogComponent } from '../../../components/dialog/dialog.component';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-merge-orders-dialog',
  imports: [MatButtonModule, TranslatePipe, PricePipe, DialogComponent],
  template: `
    <coaster-dialog [isOpen]="isOpen()" (closed)="close()">
      <div class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-90 w-[90vw] flex flex-col gap-4">
        <h2 class="text-lg font-bold text-on-surface">{{ 'orders.merge_title' | translate }}</h2>
        <p class="text-sm text-on-surface-variant">{{ 'orders.merge_description' | translate }}</p>

        <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          @for (order of otherOrders(); track order.id) {
            <button
              class="w-full flex justify-between items-center"
              (click)="select(order.id)"
            >
              <span class="font-semibold text-on-surface">{{
                order.tableName ?? ('orders.bar_order' | translate)
              }}</span>
              <span class="font-bold text-primary text-sm">{{ order.totalAmount | price }}</span>
            </button>
          } @empty {
            <p class="text-on-surface-variant text-sm text-center py-4">{{ 'orders.no_other_orders' | translate }}</p>
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
  })
export class MergeOrdersDialog {
  public readonly orders = input.required<Order[]>();
  public readonly currentOrderId = input.required<string>();
  public readonly isOpen = input.required<boolean>();

  public readonly closed = output<string | undefined>();

  protected readonly otherOrders = computed(() => this.orders().filter((o) => o.id !== this.currentOrderId()));

  protected select(orderId: string) {
    this.closed.emit(orderId);
  }

  protected close() {
    this.closed.emit(undefined);
  }
}
