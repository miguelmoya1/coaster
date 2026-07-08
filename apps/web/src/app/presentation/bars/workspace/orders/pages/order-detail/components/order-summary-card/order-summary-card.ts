import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Order, OrderStatus } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-order-summary-card',
  imports: [TranslatePipe, MatIcon, PricePipe],
  template: `
    <div class="flex justify-between items-center bg-surface-container rounded-2xl p-4">
      <div class="flex flex-col gap-1">
        <span class="text-sm text-on-surface-variant font-medium">
          @if (order().status === OrderStatus.OPEN) {
            {{ 'orders.open_orders' | translate }}
          } @else if (order().status === OrderStatus.CLOSED) {
            {{ 'history.status_closed' | translate }}
          } @else {
            {{ 'history.status_cancelled' | translate }}
          }
        </span>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-on-surface-variant">
            {{ order().items.length }} {{ 'history.items' | translate }}
          </span>
          @if (order().amountPaidCash > 0 || order().amountPaidCard > 0) {
            <span class="text-xxs text-on-surface-variant/80 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>{{ 'orders.paid' | translate }}:</span>
              @if (order().amountPaidCash > 0) {
                <span
                  class="flex items-center gap-0.5 text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0"
                >
                  <mat-icon>payments</mat-icon>
                  {{ order().amountPaidCash | price }}
                </span>
              }
              @if (order().amountPaidCard > 0) {
                <span
                  class="flex items-center gap-0.5 text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded-full shrink-0"
                >
                  <mat-icon>credit_card</mat-icon>
                  {{ order().amountPaidCard | price }}
                </span>
              }
            </span>
          }
        </div>
      </div>
      <span class="text-2xl font-black" [class.text-primary]="order().status === OrderStatus.OPEN">
        {{ order().totalAmount | price }}
      </span>
    </div>
  `,
})
export class OrderSummaryCard {
  protected readonly OrderStatus = OrderStatus;
  public readonly order = input.required<Order>();
}
