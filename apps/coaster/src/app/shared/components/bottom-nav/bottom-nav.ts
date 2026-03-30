import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideLayoutDashboard,
  lucidePackage,
  lucideUsers,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-bottom-nav',
  imports: [
    NgIcon,
    Toolbar,
    ToolbarWidget,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
  ],
  viewProviders: [
    provideIcons({
      lucideLayoutDashboard,
      lucidePackage,
      lucideCalendar,
      lucideUsers,
    }),
  ],
  template: `
    <nav
      ngToolbar
      orientation="horizontal"
      class="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 h-20 bg-surface-container/90 backdrop-blur-2xl rounded-t-nav z-50 shadow-nav pb-safe"
    >
      @for (item of navItems(); track item.value) {
        <a
          ngToolbarWidget
          [value]="item.value"
          [routerLink]="item.link"
          routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-110"
          class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
        >
          <ng-icon [name]="item.icon" class="text-2xl" />
          <span class="font-bold text-xxs-plus uppercase tracking-wider">
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

  protected readonly navItems = computed(() => [
    {
      value: 'dashboard',
      link: `/bars/${this.barId()}/dashboard`,
      icon: 'lucideLayoutDashboard',
      labelKey: 'nav.dashboard',
    },
    {
      value: 'pantry',
      link: `/bars/${this.barId()}/pantry`,
      icon: 'lucidePackage',
      labelKey: 'nav.pantry',
    },
    {
      value: 'roster',
      link: `/bars/${this.barId()}/roster`,
      icon: 'lucideCalendar',
      labelKey: 'nav.roster',
    },
    {
      value: 'staff',
      link: `/bars/${this.barId()}/staff`,
      icon: 'lucideUsers',
      labelKey: 'nav.staff',
    },
  ]);
}
