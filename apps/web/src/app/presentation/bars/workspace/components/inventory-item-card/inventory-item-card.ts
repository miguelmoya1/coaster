import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StockStatus, StockStatusPipe } from '@coaster/products';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackage, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBadge } from '../../../../components/badge/badge';
import { CoasterTitle } from '../../../../components/typography/typography';
import { PricePipe } from '../../pipes/price/price';

@Component({
  selector: 'coaster-inventory-item-card',
  template: `
    <div class="flex items-center w-full min-w-0">
      <div
        class="w-12 h-12 sm:w-14 sm:h-14 bg-surface-container-highest rounded-lg flex items-center justify-center mr-3 sm:mr-4 shrink-0"
      >
        <ng-icon [name]="icon()!" [class]="'text-2xl sm:text-3xl ' + (statusLevel() | stockStatus: 'text-color')" />
      </div>

      <div class="grow min-w-0 mr-3 sm:mr-4 flex flex-col gap-0.5">
        <h3
          coaster-title
          class="line-clamp-2 wrap-break-word text-sm sm:text-base font-bold text-on-surface"
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
              'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ' +
              (statusLevel() | stockStatus: 'bg-color') +
              (statusLevel() === 'ALERT' ? ' animate-pulse' : '')
            "
          ></span>
          <span class="text-xl sm:text-2xl font-black text-on-surface">{{
            (qty() < 10 && qty() > 0 ? '0' : '') + qty()
          }}</span>
        </div>
        <span
          coaster-badge
          [variant]="statusLevel() | stockStatus: 'badge-variant'"
          class="scale-90 sm:scale-100 origin-right"
        >
          {{ statusLevel() | stockStatus: 'label' | translate }}
        </span>
      </div>
    </div>

    @if (showEditButton()) {
      <div
        class="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t border-outline-variant/10 sm:border-t-0 shrink-0"
      >
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer active:scale-95 duration-100"
          (click)="onEditClick($event)"
        >
          <ng-icon name="lucidePencil" class="text-xl" />
        </button>
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full bg-error/10 hover:bg-error/20 text-error transition-colors cursor-pointer active:scale-95 duration-100"
          (click)="onDeleteClick($event)"
        >
          <ng-icon name="lucideTrash2" class="text-xl" />
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
  imports: [NgIcon, CoasterBadge, CoasterTitle, PricePipe, StockStatusPipe, TranslatePipe],
  viewProviders: [provideIcons({ lucidePackage, lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemCard {
  readonly #stockStatusPipe = new StockStatusPipe();

  readonly itemName = input.required<string>();
  readonly qty = input.required<number>();
  readonly price = input<number>(0);
  readonly icon = input('lucidePackage');
  readonly statusLevel = input<StockStatus>('GOOD');
  readonly disabled = input(false);
  readonly showEditButton = input(false);
  readonly editClicked = output<void>();
  readonly deleteClicked = output<void>();

  readonly hostClasses = computed(
    () =>
      'group flex flex-col sm:flex-row sm:items-center bg-surface-container-high p-4 rounded-xl border-l-4 hover:bg-surface-bright transition-colors cursor-pointer ' +
      this.#stockStatusPipe.transform(this.statusLevel(), 'border'),
  );

  onEditClick(event: Event) {
    event.stopPropagation();
    this.editClicked.emit();
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
