import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Order, OrderItemId } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-order-detail-sheet',
  imports: [MatIcon, TranslatePipe, MatButtonModule, PricePipe],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-bold text-on-surface">
          {{ order().tableName ?? ('orders.bar_order' | translate) }}
        </h3>
        <span class="text-2xl font-black text-primary">{{ order().totalAmount | price }}</span>
      </div>

      <div class="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
        @for (item of order().items; track item.id) {
          <div
            class="bg-surface-container rounded-xl p-4 flex items-center gap-3"
            [class.opacity-50]="item.paymentStatus === 'PAID'"
          >
            <div class="flex-1 flex flex-col gap-1">
              <span class="font-semibold text-on-surface text-sm">{{
                item.productName ?? item.productId | translate
              }}</span>
              <div class="flex gap-2 items-center">
                <span class="text-xs text-on-surface-variant">x{{ item.quantity }}</span>
                <span class="text-xs font-bold text-on-surface">{{
                  item.priceAtPurchase * item.quantity | price
                }}</span>
              </div>
              <div class="flex gap-1.5 mt-1">
                @if (item.paymentStatus === 'PAID') {
                  <span class="text-xxs font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                    {{ 'orders.paid' | translate }}
                  </span>
                }
                @if (item.deliveryStatus === 'SERVED') {
                  <span class="text-xxs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                    {{ 'orders.served' | translate }}
                  </span>
                }
              </div>
            </div>

            <div class="flex gap-1">
              @if (item.deliveryStatus !== 'SERVED') {
                <button mat-icon-button
                  (click)="deliverItemClicked.emit(item.id)"
                  [title]="'orders.mark_served' | translate"
                >
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">chef_hat</mat-icon>
                </button>
              }
              @if (item.paymentStatus !== 'PAID') {
                <button mat-icon-button
                  (click)="payItemClicked.emit(item.id)"
                  [title]="'orders.mark_paid' | translate"
                >
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">credit_card</mat-icon>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <div class="grid grid-cols-2 gap-2 mt-2">
        <button mat-stroked-button class="w-full" (click)="addItemsClicked.emit()">
          <mat-icon style="font-size: 18px; width: 18px; height: 18px;">add_box</mat-icon>
          {{ 'orders.add_items' | translate }}
        </button>
        <button mat-flat-button class="w-full" (click)="checkoutClicked.emit()">
          <mat-icon style="font-size: 18px; width: 18px; height: 18px;">credit_card</mat-icon>
          {{ 'orders.checkout' | translate }}
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button mat-stroked-button class="w-full" (click)="moveTableClicked.emit()">
          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">swap_horiz</mat-icon>
          {{ 'orders.move' | translate }}
        </button>
        <button mat-stroked-button class="w-full" (click)="mergeClicked.emit()">
          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">merge</mat-icon>
          {{ 'orders.merge' | translate }}
        </button>
        <button mat-stroked-button class="w-full" (click)="cancelClicked.emit()">
          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">close</mat-icon>
          {{ 'orders.cancel_order' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailSheet {
  readonly order = input.required<Order>();
  readonly addItemsClicked = output<void>();
  readonly checkoutClicked = output<void>();
  readonly moveTableClicked = output<void>();
  readonly mergeClicked = output<void>();
  readonly cancelClicked = output<void>();
  readonly payItemClicked = output<OrderItemId>();
  readonly deliverItemClicked = output<OrderItemId>();
}
