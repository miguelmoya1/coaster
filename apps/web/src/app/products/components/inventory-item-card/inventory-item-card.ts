import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StockStatus } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackage, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { BadgeVariant, CoasterBadge, CoasterTitle } from '../../../shared';

@Component({
  selector: 'coaster-inventory-item-card',
  template: `
    <div class="w-14 h-14 bg-surface-container-highest rounded-lg flex items-center justify-center mr-4 shrink-0">
      <ng-icon [name]="icon()!" [class]="'text-3xl ' + textColorClass()" />
    </div>

    <div class="grow min-w-0 mr-4 flex flex-col gap-0.5">
      <h3 coaster-title class="truncate">{{ itemName() }}</h3>
      @if (price() > 0) {
        <p class="text-on-surface-variant text-[0.8rem] font-medium truncate">{{ (price() / 100).toFixed(2) }} €</p>
      }
    </div>

    <div class="flex flex-col items-end gap-1 shrink-0">
      <div class="flex items-center gap-2">
        <span
          [class]="'w-3 h-3 rounded-full ' + bgColorClass() + (statusLevel() === 'critical' ? ' animate-pulse' : '')"
        ></span>
        <span class="text-2xl font-black text-on-surface">{{ (qty() < 10 && qty() > 0 ? '0' : '') + qty() }}</span>
      </div>
      <span coaster-badge [variant]="badgeVariant()">{{ statusText() }}</span>
    </div>

    @if (showEditButton()) {
      <div class="ml-4 flex items-center gap-2 shrink-0">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors"
          (click)="onEditClick($event)"
        >
          <ng-icon name="lucidePencil" class="text-xl" />
        </button>
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full bg-error/10 hover:bg-error/20 text-error transition-colors"
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
    '[class]':
      "'group flex items-center bg-surface-container-high p-4 rounded-xl border-l-4 hover:bg-surface-bright transition-colors cursor-pointer block ' + borderColorClass()",
  },
  imports: [CommonModule, NgIcon, CoasterBadge, CoasterTitle],
  viewProviders: [provideIcons({ lucidePackage, lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemCard {
  readonly itemName = input.required<string>();
  // readonly locationText = input.required<string>();
  readonly qty = input.required<number>();
  readonly price = input<number>(0);
  readonly icon = input('lucidePackage');
  readonly statusLevel = input<StockStatus>('good');
  readonly disabled = input(false);
  readonly showEditButton = input(false);
  readonly editClicked = output<void>();
  readonly deleteClicked = output<void>();

  onEditClick(event: Event) {
    event.stopPropagation();
    this.editClicked.emit();
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }

  readonly borderColorClass = computed(() => {
    switch (this.statusLevel()) {
      case 'critical':
        return 'border-error';
      case 'low':
        return 'border-tertiary';
      case 'good':
        return 'border-secondary';
    }
  });

  readonly textColorClass = computed(() => {
    switch (this.statusLevel()) {
      case 'critical':
        return 'text-error';
      case 'low':
        return 'text-tertiary';
      case 'good':
        return 'text-secondary';
    }
  });

  readonly bgColorClass = computed(() => {
    switch (this.statusLevel()) {
      case 'critical':
        return 'bg-error';
      case 'low':
        return 'bg-tertiary';
      case 'good':
        return 'bg-secondary';
    }
  });

  readonly statusText = computed(() => {
    switch (this.statusLevel()) {
      case 'critical':
        return 'Critical';
      case 'low':
        return 'Low Stock';
      case 'good':
        return 'Good';
    }
  });

  readonly badgeVariant = computed((): BadgeVariant => {
    switch (this.statusLevel()) {
      case 'critical':
        return 'error';
      case 'low':
        return 'warning';
      case 'good':
        return 'success';
    }
  });
}
