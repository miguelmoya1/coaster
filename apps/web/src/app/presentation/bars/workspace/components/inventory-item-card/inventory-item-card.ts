import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StockStatus, StockStatusPipe } from '@coaster/products';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { PricePipe } from '../../pipes/price/price';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-inventory-item-card',
  template: `
    <div class="flex items-center w-full min-w-0">
      <div
        class="w-12 h-12 sm:w-14 sm:h-14 bg-surface-container/60 border border-outline-variant/10 rounded-xl flex items-center justify-center mr-3.5 shrink-0 transition-transform group-hover:scale-105"
      >
        <mat-icon [class]="'text-2xl sm:text-3xl ' + (statusLevel() | stockStatus: 'text-color')">{{ icon() }}</mat-icon>
      </div>

      <div class="grow min-w-0 mr-3 sm:mr-4 flex flex-col gap-0.5">
        <h3
          class="heading-3 line-clamp-2 wrap-break-word text-sm sm:text-base font-bold text-on-surface"
          [title]="itemName() | translate"
        >
          {{ itemName() | translate }}
        </h3>
        @if (price() > 0) {
          <p class="text-on-surface-variant text-[0.75rem] sm:text-[0.8rem] font-medium truncate">
            {{ price() | price }}
          </p>
        }
      </div>

      <div class="flex flex-col items-end gap-1 shrink-0 ml-auto">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span
            [class]="
              'w-2 h-2 rounded-full ' +
              (statusLevel() | stockStatus: 'bg-color') +
              (statusLevel() === 'ALERT' ? ' animate-pulse' : '')
            "
          ></span>
          <div class="flex items-baseline gap-0.5">
            <span class="text-lg sm:text-xl font-black text-on-surface">{{ qty() }}</span>
            <span class="text-[0.65rem] sm:text-xs font-bold text-on-surface-variant uppercase">ud</span>
          </div>
        </div>
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] sm:text-[0.7rem] font-bold uppercase tracking-wider scale-90 sm:scale-100 origin-right"
          [class]="badgeClass()"
        >
          {{ statusLevel() | stockStatus: 'label' | translate }}
        </span>
      </div>
    </div>

    @if (showEditButton()) {
      <div
        class="flex items-center gap-1 mt-3 sm:mt-0 sm:ml-4 justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t border-outline-variant/20 sm:border-t-0 shrink-0"
      >
        <button mat-icon-button
          (click)="onEditClick($event)"
          class="text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Editar producto"
        >
          <mat-icon class="text-lg">edit</mat-icon>
        </button>
        <button mat-icon-button
          class="text-error/70 hover:text-error transition-colors"
          (click)="onDeleteClick($event)"
          aria-label="Eliminar producto"
        >
          <mat-icon class="text-lg">delete</mat-icon>
        </button>
      </div>
    }
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]': 'hostClasses()',
  },
  imports: [MatButtonModule, MatIcon, PricePipe, StockStatusPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemCard {
  readonly #stockStatusPipe = new StockStatusPipe();

  readonly itemName = input.required<string>();
  readonly qty = input.required<number>();
  readonly price = input<number>(0);
  readonly icon = input('inventory_2');
  readonly statusLevel = input<StockStatus>('GOOD');
  readonly disabled = input(false);
  readonly showEditButton = input(false);
  readonly editClicked = output<void>();
  readonly deleteClicked = output<void>();

  readonly hostClasses = computed(
    () =>
      'group flex flex-col sm:flex-row sm:items-center bg-surface-container-high/40 backdrop-blur-md p-4 rounded-2xl border border-outline-variant/20 border-l-4 hover:bg-surface-container-high/80 hover:border-primary/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ' +
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
