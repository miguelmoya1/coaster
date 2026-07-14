import { Component, input, output } from '@angular/core';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Order, OrderStatus, AdjustmentTarget, AdjustmentType } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-order-summary-card',
  imports: [TranslatePipe, MatIcon, PricePipe, MatIconButton, MatButton],
  template: `
    <div class="flex flex-col bg-surface-container rounded-2xl p-4 gap-4">
      <div class="flex justify-between items-start">
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
          @if (order().notes) {
            <div class="flex items-start gap-1 mt-2 text-sm text-on-surface-variant bg-surface-container-highest p-2 rounded-lg">
              <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]! m-0! shrink-0">notes</mat-icon>
              <span class="leading-tight break-all">{{ order().notes }}</span>
            </div>
          }
        </div>
        
        <div class="flex flex-col items-end gap-1">
          <div class="text-sm text-on-surface-variant flex items-center gap-2">
            <span>Subtotal</span>
            <span class="font-semibold">{{ order().orderTotal | price }}</span>
          </div>

          @for (adj of globalAdjustments(); track adj.id) {
            <div class="text-sm text-tertiary flex items-center gap-2">
              @if (order().status === OrderStatus.OPEN) {
                <button mat-icon-button class="w-6! h-6! p-0!" (click)="removeAdjustment.emit(adj.id)">
                  <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]!">close</mat-icon>
                </button>
              }
              <span>{{ adj.reason || 'Descuento' }} ({{ adj.type === AdjustmentType.PERCENTAGE ? adj.value + '%' : (adj.value | price) }})</span>
            </div>
          }

          <div class="text-sm text-on-surface-variant flex items-center gap-2 group">
            @if (order().status === OrderStatus.OPEN) {
              <button mat-icon-button class="w-6! h-6! p-0! opacity-0 group-hover:opacity-100 transition-opacity" (click)="updateTip.emit(order().tipAmount || 0)">
                <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]!">edit</mat-icon>
              </button>
            }
            <span>Propina</span>
            <span class="font-semibold">{{ order().tipAmount || 0 | price }}</span>
          </div>
          
          @if (order().status === OrderStatus.OPEN) {
            <div class="mt-1 flex gap-2">
              <button mat-button class="text-xs" (click)="addAdjustment.emit()">+ Descuento</button>
              <button mat-button class="text-xs" (click)="updateTip.emit(order().tipAmount || 0)">+ Propina</button>
            </div>
          }
        </div>
      </div>
      
      <div class="flex justify-between items-center border-t border-outline-variant pt-3 mt-1">
        <span class="text-lg font-bold">Total a Pagar</span>
        <span class="text-2xl font-black" [class.text-primary]="order().status === OrderStatus.OPEN">
          {{ order().payableTotal | price }}
        </span>
      </div>
    </div>
  `,
})
export class OrderSummaryCard {
  protected readonly OrderStatus = OrderStatus;
  protected readonly AdjustmentType = AdjustmentType;
  
  public readonly order = input.required<Order>();

  public readonly updateTip = output<number>();
  public readonly addAdjustment = output<void>();
  public readonly removeAdjustment = output<string>();

  globalAdjustments() {
    return this.order().adjustments?.filter(a => a.target === AdjustmentTarget.ORDER) || [];
  }
}
