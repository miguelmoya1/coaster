import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBanknote, lucideCreditCard, lucideX } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogComponent } from '../../../components/dialog/dialog.component';
import { PricePipe } from '../../../pipes/price/price';
import type { PaymentMethod } from '@coaster/common';

@Component({
  selector: 'coaster-payment-method-dialog',
  imports: [NgIcon, TranslatePipe, DialogComponent, PricePipe],
  viewProviders: [
    provideIcons({
      lucideBanknote,
      lucideCreditCard,
      lucideX,
    }),
  ],
  template: `
    <coaster-dialog [isOpen]="isOpen()" (closed)="cancel()">
      <div class="bg-surface-container rounded-3xl p-6 shadow-elevated max-w-md w-[90vw] outline-none flex flex-col gap-6 relative overflow-hidden">
        <!-- Close button in top-right -->
        <button
          class="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 active:scale-95 transition-all cursor-pointer"
          (click)="cancel()"
        >
          <ng-icon name="lucideX" size="18" />
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
            class="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 active:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 transition-all duration-300 group cursor-pointer active:scale-95 hover:shadow-lg hover:shadow-emerald-500/5"
            (click)="selectMethod('CASH')"
          >
            <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all duration-300 shrink-0">
              <ng-icon name="lucideBanknote" size="26" />
            </div>
            <span class="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
              {{ 'orders.payment_method_cash' | translate }}
            </span>
          </button>

          <!-- Card Button -->
          <button
            class="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/10 active:bg-indigo-500/15 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-all duration-300 group cursor-pointer active:scale-95 hover:shadow-lg hover:shadow-indigo-500/5"
            (click)="selectMethod('CARD')"
          >
            <div class="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/25 transition-all duration-300 shrink-0">
              <ng-icon name="lucideCreditCard" size="26" />
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
