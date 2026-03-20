import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLayoutDashboard, lucidePackage, lucideCalendar, lucideUsers } from '@ng-icons/lucide';
@Component({
  selector: 'coaster-bottom-nav',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideLayoutDashboard, lucidePackage, lucideCalendar, lucideUsers })],
  template: `
    <nav class="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 h-20 bg-surface-container/90 backdrop-blur-2xl rounded-t-nav z-50 shadow-nav pb-safe">
      <a class="flex flex-col items-center justify-center bg-surface-bright text-primary rounded-2xl px-5 py-2 scale-110 transition-transform active:scale-90 duration-150 gap-1 cursor-pointer">
        <ng-icon name="lucideLayoutDashboard" class="text-2xl" style="font-variation-settings: 'FILL' 1;"></ng-icon>
        <span class="font-['Inter'] font-bold text-xxs-plus uppercase tracking-wider">Dashboard</span>
      </a>
      <a class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer">
        <ng-icon name="lucidePackage" class="text-2xl"></ng-icon>
        <span class="font-['Inter'] font-bold text-xxs-plus uppercase tracking-wider">Pantry</span>
      </a>
      <a class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer">
        <ng-icon name="lucideCalendar" class="text-2xl"></ng-icon>
        <span class="font-['Inter'] font-bold text-xxs-plus uppercase tracking-wider">Roster</span>
      </a>
      <a class="flex flex-col items-center justify-center text-on-surface-variant px-5 py-2 hover:text-white transition-all active:scale-90 duration-150 gap-1 cursor-pointer">
        <ng-icon name="lucideUsers" class="text-2xl"></ng-icon>
        <span class="font-['Inter'] font-bold text-xxs-plus uppercase tracking-wider">Staff</span>
      </a>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomNavComponent {}
