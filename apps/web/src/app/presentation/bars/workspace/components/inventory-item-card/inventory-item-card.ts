import { Component, computed, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { StockStatus } from '@coaster/common';
import { StockStatusPipe } from '@coaster/products';

import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../pipes/price/price';

@Component({
  selector: 'coaster-inventory-item-card',
  template: `
    <div class="flex items-center justify-between w-full gap-2 min-w-0">
      <div class="flex items-center min-w-0 flex-1 gap-3">
        <!-- Icon / Image -->
        <div
          class="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
        >
          @if (imageUrl()) {
            <img
              [src]="imageUrl()"
              alt="product image"
              class="w-full h-full object-cover"
              (error)="imageError = true"
              [class.hidden]="imageError"
            />
            @if (imageError) {
              <mat-icon [class]="'text-xl ' + (statusLevel() | stockStatus: 'text-color')">{{ icon() }}</mat-icon>
            }
          } @else {
            <mat-icon [class]="'text-xl ' + (statusLevel() | stockStatus: 'text-color')">{{ icon() }}</mat-icon>
          }
        </div>

        <!-- Info -->
        <div class="grow min-w-0 flex flex-col gap-0.5">
          <h3
            data-testid="pantry-item-name"
            class="text-sm font-bold text-on-surface truncate"
            [title]="itemName() | translate"
          >
            {{ itemName() | translate }}
          </h3>
          @if (price() > 0) {
            <span class="text-on-surface-variant text-xs font-medium truncate">
              {{ price() | price }}
            </span>
          }
        </div>
      </div>

      <!-- Status & Stock & Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          [class]="badgeClass()"
        >
          {{ statusLevel() | stockStatus: 'label' | translate }}
        </span>

        <div
          class="flex items-baseline gap-0.5 bg-surface-container-highest/60 px-2 py-1 rounded-md border border-outline-variant/10"
        >
          <span class="text-base font-black text-on-surface">{{ qty() }}</span>
          <span class="text-[9px] font-bold text-on-surface-variant uppercase">ud</span>
        </div>

        @if (showEditButton()) {
          <div class="flex items-center gap-0.5 ml-1">
            <button mat-icon-button (click)="onEditClick($event)" aria-label="Editar producto">
              <mat-icon class="text-lg">edit</mat-icon>
            </button>
            <button mat-icon-button (click)="onDeleteClick($event)" aria-label="Eliminar producto">
              <mat-icon class="text-lg">delete</mat-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]': 'hostClasses()',
  },
  imports: [MatIconButton, MatIcon, PricePipe, StockStatusPipe, TranslatePipe],
})
export class InventoryItemCard {
  readonly #stockStatusPipe = new StockStatusPipe();

  readonly itemName = input.required<string>();
  readonly qty = input.required<number>();
  readonly price = input<number>(0);
  readonly icon = input('inventory_2');
  readonly imageUrl = input<string | undefined | null>();
  readonly statusLevel = input<StockStatus>('GOOD');
  readonly disabled = input(false);
  readonly showEditButton = input(false);
  readonly editClicked = output<void>();
  readonly deleteClicked = output<void>();

  imageError = false;

  readonly hostClasses = computed(
    () =>
      'group flex flex-row items-center bg-surface-container-high p-3 rounded-xl border-l-4 hover:bg-surface-bright transition-colors cursor-pointer ' +
      this.#stockStatusPipe.transform(this.statusLevel(), 'border'),
  );

  readonly badgeClass = computed(() => {
    const variant = this.#stockStatusPipe.transform(this.statusLevel(), 'badge-variant');
    switch (variant) {
      case 'success':
        return 'mat-bg-secondary-container mat-text-on-secondary-container';
      case 'warning':
        return 'mat-bg-tertiary-container mat-text-on-tertiary-container';
      case 'error':
        return 'mat-bg-error-container mat-text-on-error-container';
      default:
        return 'mat-bg-surface-container-highest mat-text-on-surface-variant';
    }
  });

  onEditClick(event: Event) {
    event.stopPropagation();
    this.editClicked.emit();
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
