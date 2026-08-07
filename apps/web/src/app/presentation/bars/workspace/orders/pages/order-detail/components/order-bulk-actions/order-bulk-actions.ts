import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-order-bulk-actions',
  imports: [TranslatePipe, MatIcon, PricePipe, MatButton],
  host: {
    class:
      'fixed bottom-24 left-4 right-4 z-50 bg-surface-container/85 backdrop-blur-xl border border-outline/10 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300',
  },
  template: `
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col">
        <span class="text-xs font-bold text-primary tracking-wide uppercase">
          {{ 'orders.bulk_actions_title' | translate }}
        </span>
        <span class="text-sm font-semibold text-on-surface">
          {{ 'orders.selected_items_count' | translate: { count: selectedCount() } }}
        </span>
      </div>

      <div class="flex flex-col">
        <span class="text-sm text-on-surface-variant font-medium">
          {{ 'orders.selected_total_amount' | translate }}
        </span>
        <span class="text-lg font-black text-secondary">
          {{ selectedAmount() | price }}
        </span>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2">
      <button mat-stroked-button (click)="clearSelection.emit()">
        <mat-icon>close</mat-icon>
        {{ 'common.cancel' | translate }}
      </button>

      <button mat-flat-button [disabled]="!canConfirm()" (click)="confirmChanges.emit()">
        <mat-icon>check</mat-icon>
        {{ 'orders.mark_paid' | translate }}
      </button>
    </div>
  `,
})
export class OrderBulkActions {
  public readonly selectedCount = input.required<number>();
  public readonly selectedAmount = input.required<number>();
  public readonly canConfirm = input.required<boolean>();

  public readonly clearSelection = output<void>();
  public readonly confirmChanges = output<void>();
}
