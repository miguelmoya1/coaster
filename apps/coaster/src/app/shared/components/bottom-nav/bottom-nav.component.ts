import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideLayoutDashboard,
  lucidePackage,
  lucideUsers,
} from '@ng-icons/lucide';
@Component({
  selector: 'coaster-bottom-nav',
  imports: [NgIcon, Toolbar, ToolbarWidget],
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
      <a
        ngToolbarWidget
        value="dashboard"
        [attr.aria-disabled]="disabled()"
        [tabindex]="disabled() ? -1 : 0"
        [class.opacity-50]="disabled()"
        [class.pointer-events-none]="disabled()"
        class="flex flex-col items-center justify-center bg-surface-bright text-primary rounded-2xl px-5 py-2 scale-110 transition-transform active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon
          name="lucideLayoutDashboard"
          class="text-2xl"
          style="font-variation-settings: 'FILL' 1;"
        ></ng-icon>
        <span class="font-bold text-xxs-plus uppercase tracking-wider"
          >Dashboard</span
        >
      </a>
      <a
        ngToolbarWidget
        value="pantry"
        [attr.aria-disabled]="disabled()"
        [tabindex]="disabled() ? -1 : 0"
        [class.opacity-50]="disabled()"
        [class.pointer-events-none]="disabled()"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucidePackage" class="text-2xl"></ng-icon>
        <span class="font-bold text-xxs-plus uppercase tracking-wider"
          >Pantry</span
        >
      </a>
      <a
        ngToolbarWidget
        value="roster"
        [attr.aria-disabled]="disabled()"
        [tabindex]="disabled() ? -1 : 0"
        [class.opacity-50]="disabled()"
        [class.pointer-events-none]="disabled()"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucideCalendar" class="text-2xl"></ng-icon>
        <span class="font-bold text-xxs-plus uppercase tracking-wider"
          >Roster</span
        >
      </a>
      <a
        ngToolbarWidget
        value="staff"
        [attr.aria-disabled]="disabled()"
        [tabindex]="disabled() ? -1 : 0"
        [class.opacity-50]="disabled()"
        [class.pointer-events-none]="disabled()"
        class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <ng-icon name="lucideUsers" class="text-2xl"></ng-icon>
        <span class="font-bold text-xxs-plus uppercase tracking-wider"
          >Staff</span
        >
      </a>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  readonly disabled = input(false);
}
