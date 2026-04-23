import { Tab, TabList, Tabs } from '@angular/aria/tabs';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
          <button
            ngTab
            [value]="tab.id"
            [disabled]="disabled()"
            (click)="selectTab(tab.id)"
            class="px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100"
            [class]="selectedTabId() === tab.id ? 'bg-primary text-on-primary-fixed shadow-lg' : 'bg-surface-container-highest text-on-surface-variant hover:text-white'"
          >
            {{ tab.label }}
          </button>
        } 
      </nav>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTabs {
  readonly tabs = input<CategoryTab[]>([]);
  readonly selectedTabId = input<string>();
  readonly disabled = input(false);
  readonly tabSelected = output<string>();

  public selectTab(id: string) {
    this.tabSelected.emit(id);
  }
}
