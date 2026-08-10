import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface AdminNavItem {
  path: string;
  icon: string;
  labelKey: string;
}

const NAV_ITEMS: AdminNavItem[] = [
  { path: 'overview', icon: 'monitoring', labelKey: 'admin.nav.overview' },
  { path: 'establishments', icon: 'storefront', labelKey: 'admin.nav.establishments' },
  { path: 'users', icon: 'group', labelKey: 'admin.nav.users' },
  { path: 'audit', icon: 'history', labelKey: 'admin.nav.audit' },
  { path: 'templates', icon: 'dashboard_customize', labelKey: 'admin.nav.templates' },
];

@Component({
  selector: 'coaster-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIcon, MatButton, TranslatePipe],
  template: `
    <header
      class="bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 sticky top-0 z-40 h-16 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-xs shrink-0"
    >
      <a
        routerLink="/admin/overview"
        class="flex items-center gap-2 min-w-0 text-primary font-bold text-lg hover:opacity-90 transition-opacity"
      >
        <mat-icon class="shrink-0 text-primary">admin_panel_settings</mat-icon>
        <span class="truncate">Coaster Admin</span>
      </a>

      <a
        mat-stroked-button
        routerLink="/establishments/select"
        class="shrink-0"
        [attr.aria-label]="'common.change_establishment' | translate"
      >
        <mat-icon>storefront</mat-icon>
        <span class="hidden sm:inline">{{ 'common.change_establishment' | translate }}</span>
      </a>
    </header>

    <nav
      class="lg:hidden shrink-0 border-b border-outline-variant/40 bg-surface-container/40 px-2 flex items-center gap-1 overflow-x-auto"
    >
      @for (item of navItems; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="text-primary border-primary"
          class="flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <mat-icon class="text-[20px] w-5 h-5">{{ item.icon }}</mat-icon>
          {{ item.labelKey | translate }}
        </a>
      }
    </nav>

    <div class="flex-1 min-h-0 flex">
      <aside
        class="hidden lg:flex flex-col gap-1 w-54 shrink-0 border-r border-outline-variant/40 bg-surface-container/30 p-3"
      >
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-primary/10 text-primary font-semibold"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <mat-icon class="text-[20px] w-5 h-5">{{ item.icon }}</mat-icon>
            {{ item.labelKey | translate }}
          </a>
        }
      </aside>

      <main class="flex-1 min-w-0 min-h-0 overflow-y-auto flex flex-col p-4 sm:p-6">
        <router-outlet />
      </main>
    </div>
  `,
  host: {
    class: 'h-screen w-full flex flex-col bg-background overflow-hidden',
  },
})
export default class AdminLayout {
  protected readonly navItems = NAV_ITEMS;
}
