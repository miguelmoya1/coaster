import { Component, input, output, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { BarId } from '@coaster/common';
import { StockStatus } from '@coaster/common';
import { RequireSubscriptionDirective } from '@coaster/bars';
import { StockStatusPipe } from '@coaster/products';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../pipes/price/price';
import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'coaster-inventory-item-card',
  imports: [
    MatIcon,
    PricePipe,
    StatusBadge,
    StockStatusPipe,
    TranslatePipe,
    MatIconButton,
    RequireSubscriptionDirective,
  ],
  template: `
    <span class="absolute inset-y-0 left-0 w-1 rounded-full" [class]="statusLevel() | stockStatus: 'bg-color'"></span>

    <div class="p-4 flex items-center justify-center">
      <div class="rounded-full overflow-hidden bg-surface-container-highest">
        @if (imageUrl() && !imageError()) {
          <img [src]="imageUrl()" alt="" class="w-full h-full object-cover" (error)="imageError.set(true)" />
        } @else {
          <mat-icon class="text-xl sm:text-2xl opacity-75" [class]="statusLevel() | stockStatus: 'text-color'">
            {{ icon() }}
          </mat-icon>
        }
      </div>
    </div>

    <div class="flex flex-col gap-2 py-4 truncate">
      <h3 data-testid="pantry-item-name" class="text-sm sm:text-md font-semibold m-0 truncate">
        {{ itemName() | translate }}
      </h3>

      <div class="flex flex-col gap-2 flex-wrap w-min">
        <coaster-status-badge [variant]="statusLevel() | stockStatus: 'badge-variant'">
          {{ statusLevel() | stockStatus: 'label' | translate }}
        </coaster-status-badge>

        <div class="flex items-center justify-between gap-4 w-min">
          @if (price() > 0) {
            <span class="text-xs sm:text-sm font-semibold text-on-surface-variant/70">
              {{ price() | price }}
            </span>
          }

          <div class="flex items-center gap-1">
            <span class="text-xs sm:text-sm font-black text-on-surface leading-none">
              {{ qty() }}
            </span>
            <span class="text-xs font-bold text-on-surface-variant uppercase leading-none"> ud </span>
          </div>
        </div>
      </div>
    </div>

    @if (showEditButton()) {
      <div class="flex items-center gap-1">
        <button mat-icon-button coasterRequireSubscription [barId]="barId()" (click)="onEditClick($event)">
          <mat-icon class="text-base">edit</mat-icon>
        </button>
        <button mat-icon-button coasterRequireSubscription [barId]="barId()" (click)="onDeleteClick($event)">
          <mat-icon class="text-base">delete</mat-icon>
        </button>
      </div>
    }
  `,
  host: {
    class: 'bg-surface-container-high rounded-xl hover:bg-surface-bright product',
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
  },
  styles: `
    :host {
      position: relative;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
    }
  `,
})
export class InventoryItemCard {
  readonly barId = input.required<BarId>();
  readonly itemName = input.required<string>();
  readonly qty = input.required<number>();
  readonly price = input<number>(0);
  readonly icon = input('inventory_2');
  readonly imageUrl = input<string | undefined | null>();
  readonly statusLevel = input<StockStatus>(StockStatus.GOOD);
  readonly disabled = input(false);
  readonly showEditButton = input(false);

  readonly editClicked = output<void>();
  readonly deleteClicked = output<void>();

  readonly imageError = signal(false);

  onEditClick(event: Event) {
    event.stopPropagation();
    this.editClicked.emit();
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
