import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { BarPermissionType } from '@coaster/common';
import { BarPermission } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

interface NavItem {
  value: string;
  link: string;
  icon: string;
  labelKey: string;
  requiredPermission?: BarPermissionType;
}

@Component({
  selector: 'coaster-bottom-nav',
  imports: [MatIcon, Toolbar, ToolbarWidget, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav
      ngToolbar
      orientation="horizontal"
      class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md flex justify-around items-center h-16 bg-surface-container-high/80 backdrop-blur-2xl rounded-full z-50 shadow-elevated border border-outline-variant/20 shrink-0"
    >
      @for (item of visibleNavItems(); track item.value) {
        <a
          ngToolbarWidget
          [value]="item.value"
          [routerLink]="item.link"
          routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-105 sm:scale-110"
          class="flex flex-col items-center justify-center text-on-surface-variant px-3 sm:px-5 py-1.5 sm:py-2 hover:text-white transition-all active:scale-95 duration-150 gap-0 sm:gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
        >
          <mat-icon class="text-xl sm:text-2xl">{{ item.icon }}</mat-icon>
          <span class="font-bold text-xxs sm:text-xxs-plus uppercase tracking-wider hidden sm:block">
            {{ item.labelKey | translate }}
          </span>
        </a>
      }
    </nav>
  `,
})
export class BottomNav {
  public readonly barId = input.required<string>();
  readonly #barsStore = inject(BarsStore);

  private readonly allNavItems = computed<NavItem[]>(() => [
    {
      value: 'dashboard',
      link: `/bars/${this.barId()}/dashboard`,
      icon: 'dashboard',
      labelKey: 'nav.dashboard',
      requiredPermission: BarPermission.VIEW_DASHBOARD,
    },
    {
      value: 'orders',
      link: `/bars/${this.barId()}/orders`,
      icon: 'assignment',
      labelKey: 'nav.orders',
      requiredPermission: BarPermission.VIEW_ORDERS,
    },
    {
      value: 'roster',
      link: `/bars/${this.barId()}/roster`,
      icon: 'calendar_today',
      labelKey: 'nav.roster',
      requiredPermission: BarPermission.VIEW_SHIFTS,
    },
    {
      value: 'pantry',
      link: `/bars/${this.barId()}/pantry`,
      icon: 'inventory_2',
      labelKey: 'nav.pantry',
      requiredPermission: BarPermission.VIEW_PRODUCTS,
    },
    {
      value: 'staff',
      link: `/bars/${this.barId()}/staff`,
      icon: 'group',
      labelKey: 'nav.staff',
      requiredPermission: BarPermission.INVITE_MEMBER,
    },
  ]);

  protected readonly visibleNavItems = computed(() =>
    this.allNavItems().filter(
      (item) => !item.requiredPermission || this.#barsStore.hasPermission(item.requiredPermission),
    ),
  );
}
