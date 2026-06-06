import { Tab as TabAria, TabList, Tabs as TabsAria } from '@angular/aria/tabs';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface Tab<T> {
  id: T;
  label: string;
}

@Component({
  selector: 'coaster-tabs',
  imports: [TabList, TabAria, TranslatePipe],
  hostDirectives: [TabsAria],
  template: `
    <nav ngTabList class="flex overflow-x-auto hide-scrollbar gap-2 py-2">
      @for (tab of tabsFiltered(); track tab.id) {
        <button
          ngTab
          [value]="tab.value"
          [disabled]="disabled()"
          (click)="selectTab(tab.id)"
          class="px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100"
          [class]="
            selectedTabId() === tab.id
              ? 'bg-primary text-on-primary-fixed shadow-md'
              : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright/80'
          "
        >
          {{ tab.label | translate }}
        </button>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs<T> {
  readonly tabs = input<Tab<T>[]>([]);
  readonly selectedTabId = input<T>();
  readonly disabled = input(false);
  readonly tabSelected = output<T>();

  readonly tabsFiltered = computed(() => {
    return this.tabs().map((tab) => ({
      ...tab,
      value: tab.id as string,
    }));
  });

  public selectTab(id: T) {
    this.tabSelected.emit(id);
  }
}
