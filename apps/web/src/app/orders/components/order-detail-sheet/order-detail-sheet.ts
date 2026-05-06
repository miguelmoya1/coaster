import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Order, OrderItemId } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRightLeft,
  lucideCheck,
  lucideChefHat,
  lucideCreditCard,
  lucideMerge,
  lucidePackagePlus,
  lucideX,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe, CoasterBtn } from '../../../shared';

@Component({
  selector: 'coaster-order-detail-sheet',
  imports: [NgIcon, TranslatePipe, CoasterBtn, PricePipe],
  viewProviders: [
    provideIcons({
      lucideCheck,
      lucideChefHat,
      lucideCreditCard,
      lucidePackagePlus,
      lucideArrowRightLeft,
      lucideMerge,
      lucideX,
    }),
  ],
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
              <span class="font-semibold text-on-surface text-sm">{{ item.productName ?? item.productId }}</span>
              <div class="flex gap-2 items-center">
                <span class="text-xs text-on-surface-variant">x{{ item.quantity }}</span>
                <span class="text-xs font-bold text-on-surface">{{ item.priceAtPurchase * item.quantity | price }}</span>
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
                <button
                  class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-transform"
                  (click)="deliverItemClicked.emit(item.id)"
                  [title]="'orders.mark_served' | translate"
                >
                  <ng-icon name="lucideChefHat" size="18" />
                </button>
              }
              @if (item.paymentStatus !== 'PAID') {
                <button
                  class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center active:scale-90 transition-transform"
                  (click)="payItemClicked.emit(item.id)"
                  [title]="'orders.mark_paid' | translate"
                >
                  <ng-icon name="lucideCreditCard" size="18" />
                </button>
              }
            </div>
          </div>
        }
      </div>

      <div class="grid grid-cols-2 gap-2 mt-2">
        <button coaster-btn variant="outline" (click)="addItemsClicked.emit()">
          <ng-icon name="lucidePackagePlus" size="18" />
          {{ 'orders.add_items' | translate }}
        </button>
        <button coaster-btn (click)="checkoutClicked.emit()">
          <ng-icon name="lucideCreditCard" size="18" />
          {{ 'orders.checkout' | translate }}
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button coaster-btn variant="outline" (click)="moveTableClicked.emit()">
          <ng-icon name="lucideArrowRightLeft" size="16" />
          {{ 'orders.move' | translate }}
        </button>
        <button coaster-btn variant="outline" (click)="mergeClicked.emit()">
          <ng-icon name="lucideMerge" size="16" />
          {{ 'orders.merge' | translate }}
        </button>
        <button coaster-btn variant="outline" class="text-error!" (click)="cancelClicked.emit()">
          <ng-icon name="lucideX" size="16" />
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
