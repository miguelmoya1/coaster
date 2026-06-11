import { Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { OrderItem } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NumberInput } from '../../../../../../../components/number-input/number-input';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-order-item-card',
  imports: [TranslatePipe, MatIcon, PricePipe, MatIconButton, NumberInput],
  template: `
    <div
      class="bg-surface-container border border-transparent rounded-xl p-4 flex items-center justify-between gap-3 transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
      [class.opacity-50]="item().paymentStatus === 'PAID' && item().deliveryStatus === 'SERVED'"
      [class.border-primary/20]="isSelected()"
      [class.bg-primary/5]="isSelected()"
      [class.cursor-pointer]="isOpen()"
      [attr.role]="isOpen() ? 'button' : null"
      [attr.tabindex]="isOpen() ? 0 : null"
      (click)="isOpen() && toggleSelect.emit()"
      (keydown.enter)="isOpen() && toggleSelect.emit(); $event.preventDefault()"
      (keydown.space)="isOpen() && toggleSelect.emit(); $event.preventDefault()"
    >
      <!-- Selection Checkbox -->
      @if (isOpen()) {
        <button
          class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0"
          [class.border-primary]="isSelected()"
          [class.bg-primary]="isSelected()"
          [class.text-on-primary]="isSelected()"
          [class.border-on-surface-variant]="!isSelected()"
          (click)="toggleSelect.emit(); $event.stopPropagation()"
        >
          @if (isSelected()) {
            <mat-icon class="stroke-3 text-xs w-3 h-3 leading-3">check</mat-icon>
          }
        </button>
      }

      <div class="flex-1 flex flex-col gap-1 min-w-0">
        <span class="font-semibold text-on-surface text-sm truncate">{{ item().productName | translate }}</span>
        <div class="flex gap-2 items-center">
          <span class="text-xs text-on-surface-variant">x{{ item().quantity }}</span>
          <span class="text-xs font-bold text-on-surface">{{ item().priceAtPurchase * item().quantity | price }}</span>
        </div>
        @if (item().quantity > 1 || item().paidQuantity > 0) {
          <div class="flex flex-col gap-0.5 mt-1">
            <span class="text-xxs text-on-surface-variant font-medium">
              {{ 'orders.paid_units' | translate: { paid: item().paidQuantity, total: item().quantity } }}
              @if (item().paidQuantity > 0) {
                <span class="opacity-80 font-semibold">
                  (
                  @if (item().paidQuantityCash > 0 && item().paidQuantityCard > 0) {
                    {{ item().paidQuantityCash }} {{ 'orders.payment_method_cash' | translate }} •
                    {{ item().paidQuantityCard }} {{ 'orders.payment_method_card' | translate }}
                  } @else if (item().paidQuantityCash > 0) {
                    {{ item().paidQuantityCash }} {{ 'orders.payment_method_cash' | translate }}
                  } @else if (item().paidQuantityCard > 0) {
                    {{ item().paidQuantityCard }} {{ 'orders.payment_method_card' | translate }}
                  }
                  )
                </span>
              }
            </span>
            @if (item().quantity > 1) {
              <span class="text-xxs text-on-surface-variant font-medium">
                {{ 'orders.served_units' | translate: { served: item().servedQuantity, total: item().quantity } }}
              </span>
            }
          </div>
        }
        <div class="flex gap-1.5 mt-1">
          @if (item().paymentStatus === 'PAID') {
            <span class="text-xxs font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
              {{ 'orders.paid' | translate }}
            </span>
          } @else if (item().paymentStatus === 'PARTIAL') {
            <span class="text-xxs font-bold text-tertiary bg-tertiary/15 px-2 py-0.5 rounded-full">
              {{ 'orders.partial_payment' | translate }}
            </span>
          }
          @if (item().deliveryStatus === 'SERVED') {
            <span class="text-xxs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
              {{ 'orders.served' | translate }}
            </span>
          } @else if (item().deliveryStatus === 'PARTIAL') {
            <span class="text-xxs font-bold text-tertiary bg-tertiary/15 px-2 py-0.5 rounded-full">
              {{ 'orders.partial_delivery' | translate }}
            </span>
          }
        </div>
      </div>

      <!-- In-row Compact Adjustment Controls -->
      @if (isOpen()) {
        <div class="flex items-center gap-2 shrink-0">
          @if (isSelected()) {
            <div class="w-28">
              <!-- Pay adjustment -->
              <coaster-number-input
                [value]="selectedQty()?.paidQty || 0"
                (valueChange)="updatePayQty.emit($event)"
                [min]="-item().paidQuantity"
                [max]="item().quantity - item().paidQuantity"
                wrapperClass="w-full"
              />
            </div>
          }

          <button
            mat-icon-button
            (click)="removeItem.emit(); $event.stopPropagation()"
            [title]="'orders.remove_item' | translate"
          >
            <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]! m-0!">delete</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class OrderItemCard {
  public readonly item = input.required<OrderItem & { productName?: string }>();
  public readonly isOpen = input.required<boolean>();
  public readonly isSelected = input.required<boolean>();
  public readonly selectedQty = input<{ paidQty: number } | undefined>();

  public readonly toggleSelect = output<void>();
  public readonly updatePayQty = output<number>();
  public readonly removeItem = output<void>();
}
