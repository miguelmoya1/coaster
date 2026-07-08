import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { PaymentMethod } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-payment-method-dialog',
  imports: [MatButton, MatIcon, TranslatePipe, MatDialogTitle, MatDialogContent, MatDialogActions, PricePipe],
  template: `
    <h2 mat-dialog-title>{{ 'orders.payment_method_title' | translate }}</h2>

    <mat-dialog-content>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ 'orders.payment_method_description' | translate }}
      </p>

      @if (amount() > 0) {
        <div class="bg-surface-bright/50 border border-outline/10 rounded-2xl p-4 text-center mb-4">
          <span class="text-xxs font-bold text-on-surface-variant tracking-wider uppercase">
            {{ 'orders.total_to_pay' | translate }}
          </span>
          <div class="text-3xl font-black text-primary mt-1">
            {{ amount() | price }}
          </div>
        </div>
      }

      <!-- Dual Column Payment Buttons -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Cash Button -->
        <button
          class="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl group cursor-pointer transition-all duration-200 hover:bg-surface-bright/50"
          (click)="selected.emit(PaymentMethod.CASH)"
        >
          <div
            class="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all duration-300 shrink-0"
          >
            <mat-icon>payments</mat-icon>
          </div>
          <span class="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
            {{ 'orders.payment_method_cash' | translate }}
          </span>
        </button>

        <!-- Card Button -->
        <button
          class="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl group cursor-pointer transition-all duration-200 hover:bg-surface-bright/50"
          (click)="selected.emit(PaymentMethod.CARD)"
        >
          <div
            class="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/25 transition-all duration-300 shrink-0"
          >
            <mat-icon>credit_card</mat-icon>
          </div>
          <span class="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
            {{ 'orders.payment_method_card' | translate }}
          </span>
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
      <button mat-button (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  host: {
    class: 'block',
  },
})
export class PaymentMethodDialog {
  protected readonly PaymentMethod = PaymentMethod;
  readonly amount = input.required<number>();

  readonly selected = output<PaymentMethod>();
  readonly canceled = output<void>();
}
