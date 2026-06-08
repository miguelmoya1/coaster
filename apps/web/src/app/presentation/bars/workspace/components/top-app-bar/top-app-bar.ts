import { Toolbar } from '@angular/aria/toolbar';
import { Component, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AvatarBadge } from '../avatar-badge/avatar-badge';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [AvatarBadge, RouterLink, MatButton, MatIconButton, MatIcon, TranslatePipe],
  hostDirectives: [Toolbar],
  host: {
    class:
      'w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-elevated shrink-0',
  },
  template: `
    <header class="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 mr-4">
      @if (image(); as image) {
        <coaster-avatar-badge [imageSrc]="image" altText="User profile" class="shrink-0" />
      }

      <h1 class="heading-1 font-black text-primary text-xl! sm:text-3xl! tracking-tighter truncate">
        {{ label() }}
      </h1>
    </header>

    <div class="relative">
      <button mat-icon-button (click)="toggleMenu()" aria-label="Open menu" [aria-expanded]="isMenuOpen()">
        <mat-icon>more_vert</mat-icon>
      </button>

      @if (isMenuOpen()) {
        <!-- Backdrop to close dropdown on click outside -->
        <button class="fixed inset-0 z-40 w-full h-full" (click)="closeMenu()" aria-label="Close menu"></button>

        <!-- Dropdown Container -->
        <div
          class="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-outline-variant/30 bg-surface-container-high/90 backdrop-blur-md p-1.5 shadow-elevated flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <!-- Cambiar de bar -->
          <a
            routerLink="/bars/select"
            (click)="closeMenu()"
            class="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container transition-all active:scale-95 text-left cursor-pointer outline-none focus-visible:bg-surface-container"
          >
            <mat-icon class="text-base text-on-surface-variant">swap_horiz</mat-icon>
            <span>{{ 'common.change_bar' | translate }}</span>
          </a>

          <div class="h-px bg-outline-variant/30 my-1"></div>

          <!-- Idioma Section -->
          <div class="flex flex-col gap-1 px-1.5 py-1">
            <div
              class="flex items-center gap-2 px-1.5 pb-1 text-xs font-bold tracking-wider text-on-surface-variant/60 uppercase"
            >
              <mat-icon class="text-xs">public</mat-icon>
              <span>{{ 'common.language' | translate }}</span>
            </div>

            <div class="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/20">
              @if (currentLang() === 'es') {
                <button mat-flat-button (click)="setLanguage('es')">ES</button>
              } @else {
                <button mat-button (click)="setLanguage('es')">ES</button>
              }
              @if (currentLang() === 'en') {
                <button mat-flat-button (click)="setLanguage('en')">EN</button>
              } @else {
                <button mat-button (click)="setLanguage('en')">EN</button>
              }
            </div>
          </div>

          <div class="h-px bg-outline-variant/30 my-1"></div>

          <!-- Cerrar sesión -->
          <button mat-button (click)="logout()" class="warn w-full flex items-center gap-3 text-error">
            <mat-icon class="text-base">logout</mat-icon>
            <span>{{ 'common.logout' | translate }}</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class TopAppBar {
  readonly label = input.required<string>();
  readonly image = input.required<string>();

  readonly #auth = inject(Auth);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);

  readonly isMenuOpen = signal(false);
  readonly currentLang = signal(this.#translate.currentLang || 'es');

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  setLanguage(lang: string): void {
    this.#translate.use(lang);
    this.currentLang.set(lang);
    this.closeMenu();
  }

  async logout(): Promise<void> {
    this.closeMenu();
    await this.#auth.logout();
    await this.#router.navigate(['/login'], { replaceUrl: true });
  }
}
