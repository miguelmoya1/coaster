import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideClipboardList,
  lucideLayoutDashboard,
  lucidePackage,
  lucideUsers,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

interface NavItem {
  value: string;
  link: string;
  icon: string;
  labelKey: string;
  ownerOnly?: boolean;
}

@Component({
  selector: 'coaster-bottom-nav',
  imports: [NgIcon, Toolbar, ToolbarWidget, RouterLink, RouterLinkActive, TranslatePipe],
  viewProviders: [
    provideIcons({
      lucideLayoutDashboard,
      lucidePackage,
      lucideCalendar,
      lucideUsers,
      lucideClipboardList,
    }),
  ],
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
          <ng-icon [name]="item.icon" class="text-xl sm:text-2xl" />
          <span class="font-bold text-xxs sm:text-xxs-plus uppercase tracking-wider hidden sm:block">
            {{ item.labelKey | translate }}
          </span>
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  public readonly barId = input.required<string>();
  public readonly isOwner = input(false);

  private readonly allNavItems = computed<NavItem[]>(() => [
    {
      value: 'dashboard',
      link: `/bars/${this.barId()}/dashboard`,
      icon: 'lucideLayoutDashboard',
      labelKey: 'nav.dashboard',
    },
    {
      value: 'orders',
      link: `/bars/${this.barId()}/orders`,
      icon: 'lucideClipboardList',
      labelKey: 'nav.orders',
    },
    {
      value: 'roster',
      link: `/bars/${this.barId()}/roster`,
      icon: 'lucideCalendar',
      labelKey: 'nav.roster',
    },
    {
      value: 'pantry',
      link: `/bars/${this.barId()}/pantry`,
      icon: 'lucidePackage',
      labelKey: 'nav.pantry',
    },
    {
      value: 'staff',
      link: `/bars/${this.barId()}/staff`,
      icon: 'lucideUsers',
      labelKey: 'nav.staff',
      ownerOnly: true,
    },
  ]);

  protected readonly visibleNavItems = computed(() =>
    this.allNavItems().filter((item) => !item.ownerOnly || this.isOwner()),
  );
}
