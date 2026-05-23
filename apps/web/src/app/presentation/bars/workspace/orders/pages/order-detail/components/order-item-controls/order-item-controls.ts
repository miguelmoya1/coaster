import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OrderItem } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChefHat, lucideCreditCard, lucideMinus, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-order-item-controls',
  standalone: true,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [
    provideIcons({
      lucideMinus,
      lucidePlus,
      lucideChefHat,
      lucideCreditCard,
      lucideTrash2,
    }),
  ],
  template: `
    <div class="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
      <!-- Kitchen / Delivery Control Group (Greenish Theme) -->
      <div class="flex items-center h-10 bg-primary/5 rounded-xl p-1 border border-primary/10 gap-1">
        @if (item().servedQuantity > 0) {
          <button
            class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-primary/20"
            (click)="unserveUnit.emit()"
            [title]="'orders.unserve_unit' | translate"
          >
            <ng-icon name="lucideMinus" size="14" />
          </button>
        }

        <span class="text-xs font-semibold text-primary px-1 min-w-5 text-center" title="Servido">
          {{ item().servedQuantity }}/{{ item().quantity }}
        </span>

        @if (item().deliveryStatus !== 'SERVED') {
          @if (item().quantity > 1) {
            <button
              class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-primary/20"
              (click)="deliverUnit.emit()"
              [title]="'orders.mark_served' | translate"
            >
              <ng-icon name="lucidePlus" size="14" />
            </button>
          }

          <button
            class="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-primary/90"
            (click)="deliverItem.emit()"
            [title]="'orders.mark_served' | translate"
          >
            <ng-icon name="lucideChefHat" size="14" />
          </button>
        }
      </div>

      <!-- Payment / Cashier Control Group (Purplish Theme) -->
      <div class="flex items-center h-10 bg-secondary/5 rounded-xl p-1 border border-secondary/10 gap-1">
        @if (item().paidQuantity > 0) {
          <button
            class="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-secondary/20"
            (click)="unpayUnit.emit()"
            [title]="'orders.unpay_unit' | translate"
          >
            <ng-icon name="lucideMinus" size="14" />
          </button>
        }

        <span class="text-xs font-semibold text-secondary px-1 min-w-5 text-center" title="Pagado">
          {{ item().paidQuantity }}/{{ item().quantity }}
        </span>

        @if (item().paymentStatus !== 'PAID') {
          @if (item().quantity > 1) {
            <button
              class="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-secondary/20"
              (click)="payUnit.emit()"
              [title]="'orders.mark_paid' | translate"
            >
              <ng-icon name="lucidePlus" size="14" />
            </button>
          }

          <button
            class="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-secondary/90"
            (click)="payItem.emit()"
            [title]="'orders.mark_paid' | translate"
          >
            <ng-icon name="lucideCreditCard" size="14" />
          </button>
        }
      </div>

      <!-- Destructive Trash Button -->
      <button
        class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-error/20"
        (click)="removeItem.emit()"
        [title]="'orders.remove_item' | translate"
      >
        <ng-icon name="lucideTrash2" size="18" />
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderItemControlsComponent {
  public readonly item = input.required<OrderItem>();

  public readonly payUnit = output<void>();
  public readonly unpayUnit = output<void>();
  public readonly payItem = output<void>();
  public readonly deliverUnit = output<void>();
  public readonly unserveUnit = output<void>();
  public readonly deliverItem = output<void>();
  public readonly removeItem = output<void>();
}
