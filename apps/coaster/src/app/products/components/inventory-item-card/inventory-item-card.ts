import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackage } from '@ng-icons/lucide';

export type InventoryStatus = 'critical' | 'low' | 'good';

@Component({
  selector: 'coaster-inventory-item-card',
  template: `
    <div class="w-14 h-14 bg-surface-container-highest rounded-lg flex items-center justify-center mr-4 shrink-0">
      <ng-icon [name]="icon()!" [class]="'text-3xl ' + textColorClass()"></ng-icon>
    </div>
    
    <div class="grow min-w-0 mr-4">
      <h3 class="font-bold text-on-surface title-lg tracking-tight truncate">{{ itemName() }}</h3>
      <!-- <p class="text-on-surface-variant text-xs truncate">{{ locationText() }}</p> -->
    </div>
    
    <div class="flex flex-col items-end gap-1 shrink-0">
      <div class="flex items-center gap-2">
        <span [class]="'w-3 h-3 rounded-full ' + bgColorClass() + (statusLevel() === 'critical' ? ' animate-pulse' : '')"></span>
        <span class="text-2xl font-black text-on-surface">{{ (qty() < 10 && qty() > 0 ? '0' : '') + qty() }}</span>
      </div>
      <span [class]="'label-sm font-bold uppercase ' + textColorClass()">{{ statusText() }}</span>
    </div>
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]': "'group flex items-center bg-surface-container-high p-4 rounded-xl border-l-4 hover:bg-surface-bright transition-colors cursor-pointer block ' + borderColorClass()"
  },
  imports: [CommonModule, NgIcon],
  viewProviders: [provideIcons({ lucidePackage })],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryItemCard {
  readonly itemName = input.required<string>();
  // readonly locationText = input.required<string>();
  readonly qty = input.required<number>();
  readonly icon = input('lucidePackage');
  readonly statusLevel = input<InventoryStatus>('good');
  readonly disabled = input(false);

  readonly borderColorClass = computed(() => {
    switch(this.statusLevel()) {
      case 'critical': return 'border-error';
      case 'low': return 'border-tertiary';
      case 'good': return 'border-secondary';
    }
  });

  readonly textColorClass = computed(() => {
    switch(this.statusLevel()) {
      case 'critical': return 'text-error';
      case 'low': return 'text-tertiary';
      case 'good': return 'text-secondary';
    }
  });

  readonly bgColorClass = computed(() => {
    switch(this.statusLevel()) {
      case 'critical': return 'bg-error';
      case 'low': return 'bg-tertiary';
      case 'good': return 'bg-secondary';
    }
  });

  readonly statusText = computed(() => {
    switch(this.statusLevel()) {
      case 'critical': return 'Critical';
      case 'low': return 'Low Stock';
      case 'good': return 'Good';
    }
  });
}
