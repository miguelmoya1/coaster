import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Tabs, TabList, Tab } from '@angular/aria/tabs';

export interface CategoryTab {
  id: string;
  label: string;
}

@Component({
  selector: 'coaster-category-tabs',
  imports: [Tabs, TabList, Tab],
  template: `
    <div ngTabs>
      <nav ngTabList class="flex overflow-x-auto hide-scrollbar gap-2 py-2">
        @for (tab of tabs(); track tab.id) {
          @if (selectedTabId() === tab.id) {
            <button ngTab [value]="tab.id" (click)="selectTab(tab.id)" class="px-6 py-3 bg-primary text-on-primary-fixed rounded-full font-bold text-sm whitespace-nowrap shadow-lg transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              {{ tab.label }}
            </button>
          } @else {
            <button ngTab [value]="tab.id" (click)="selectTab(tab.id)" class="px-6 py-3 bg-surface-container-highest text-on-surface-variant hover:text-white rounded-full font-bold text-sm whitespace-nowrap transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              {{ tab.label }}
            </button>
          }
        }
      </nav>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryTabsComponent {
  readonly tabs = input<CategoryTab[]>([]);
  readonly selectedTabId = input<string>();
  readonly tabSelected = output<string>();

  selectTab(id: string) {
    this.tabSelected.emit(id);
  }
}
