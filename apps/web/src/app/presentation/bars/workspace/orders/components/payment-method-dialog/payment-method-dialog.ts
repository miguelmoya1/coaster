import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DialogComponent } from '../../../components/dialog/dialog.component';
import { PricePipe } from '../../../pipes/price/price';
import type { PaymentMethod } from '@coaster/common';

@Component({
  selector: 'coaster-payment-method-dialog',
  imports: [MatButtonModule, MatIcon, TranslatePipe, DialogComponent, PricePipe],
  template: `
    <coaster-dialog [isOpen]="isOpen()" (closed)="cancel()">
      <div class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-md w-[90vw] outline-none flex flex-col gap-6 relative overflow-hidden">
        <!-- Close button in top-right -->
        <button mat-icon-button
          class="absolute top-4 right-4"
          (click)="cancel()"
        >
          <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
        </button>

        <div class="flex flex-col gap-1 text-center mt-2">
          <h2 class="text-xl font-black text-on-surface tracking-tight">
            {{ 'orders.payment_method_title' | translate }}
          </h2>
          <p class="text-xs text-on-surface-variant max-w-xs mx-auto">
            {{ 'orders.payment_method_description' | translate }}
          </p>
        </div>

        @if (amount() > 0) {
          <div class="bg-surface-bright/50 border border-outline/10 rounded-2xl p-4 text-center">
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
            class="flex flex-col items-center justify-center gap-3 group"
            (click)="selectMethod('CASH')"
          >
            <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all duration-300 shrink-0">
              <mat-icon style="font-size: 26px; width: 26px; height: 26px;">payments</mat-icon>
            </div>
            <span class="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
              {{ 'orders.payment_method_cash' | translate }}
            </span>
          </button>

          <!-- Card Button -->
          <button
            class="flex flex-col items-center justify-center gap-3 group"
            (click)="selectMethod('CARD')"
          >
            <div class="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/25 transition-all duration-300 shrink-0">
              <mat-icon style="font-size: 26px; width: 26px; height: 26px;">credit_card</mat-icon>
            </div>
            <span class="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
              {{ 'orders.payment_method_card' | translate }}
            </span>
          </button>
        </div>
      </div>
    </coaster-dialog>
  `,
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodDialog {
  public readonly isOpen = input.required<boolean>();
  public readonly amount = input<number>(0);

  public readonly closed = output<PaymentMethod | undefined>();

  protected selectMethod(method: PaymentMethod) {
    this.closed.emit(method);
  }

  protected cancel() {
    this.closed.emit(undefined);
  }
}
