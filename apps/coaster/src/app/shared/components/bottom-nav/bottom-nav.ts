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
@Component({
  selector: 'coaster-bottom-nav',
  imports: [NgIcon, Toolbar, ToolbarWidget, RouterLink, RouterLinkActive],
  viewProviders: [
    provideIcons({
      lucideLayoutDashboard,
      lucidePackage,
      lucideCalendar,
      lucideUsers,
    }),
  ],
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    <nav
      ngToolbar
      orientation="horizontal"
      class="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 h-20 bg-surface-container/90 backdrop-blur-2xl rounded-t-nav z-50 shadow-nav pb-safe"
    >
      <a
        ngToolbarWidget
        value="dashboard"
        [routerLink]="dashboardLink()"
        routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-110"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucideLayoutDashboard" class="text-2xl" />
        <span class="font-bold text-xxs-plus uppercase tracking-wider">
          Dashboard
        </span>
      </a>
      <a
        ngToolbarWidget
        value="pantry"
        [routerLink]="pantryLink()"
        routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-110"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucidePackage" class="text-2xl" />
        <span class="font-bold text-xxs-plus uppercase tracking-wider">
          Pantry
        </span>
      </a>
      <a
        ngToolbarWidget
        value="roster"
        [routerLink]="rosterLink()"
        routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-110"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucideCalendar" class="text-2xl" />
        <span class="font-bold text-xxs-plus uppercase tracking-wider">
          Roster
        </span>
      </a>
      <a
        ngToolbarWidget
        value="staff"
        [routerLink]="staffLink()"
        routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-110"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucideUsers" class="text-2xl" />
        <span class="font-bold text-xxs-plus uppercase tracking-wider">
          Staff
        </span>
      </a>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  public readonly barId = input.required<string>();

  protected readonly dashboardLink = computed(
    () => `/bars/${this.barId()}/dashboard`,
  );
  protected readonly pantryLink = computed(
    () => `/bars/${this.barId()}/pantry`,
  );
  protected readonly rosterLink = computed(
    () => `/bars/${this.barId()}/roster`,
  );
  protected readonly staffLink = computed(() => `/bars/${this.barId()}/staff`);
}
