import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-admin-layout',
  imports: [RouterOutlet, RouterLink, MatIcon, MatButton, TranslatePipe],
  template: `
    <header
      class="bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 sticky top-0 z-40 w-full h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs"
    >
      <div class="flex items-center gap-3">
        <a
          routerLink="/admin/dashboard"
          class="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-90 transition-opacity"
        >
          <mat-icon class="text-primary">admin_panel_settings</mat-icon>
          <span>Coaster Admin</span>
        </a>
      </div>

      <div class="flex items-center gap-2">
        <a mat-stroked-button routerLink="/bars/select">
          <mat-icon>storefront</mat-icon>
          <span class="hidden sm:inline">{{ 'common.change_bar' | translate }}</span>
        </a>
      </div>
    </header>

    <main class="w-full flex-1 min-h-0 overflow-y-auto flex flex-col">
      <router-outlet />
    </main>
  `,
  host: {
    class: 'min-h-screen w-full flex flex-col bg-background',
  },
})
export default class AdminLayout {}
