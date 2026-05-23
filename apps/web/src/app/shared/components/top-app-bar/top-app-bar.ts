import { Toolbar } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRightLeft,
  lucideGlobe,
  lucideLogOut,
  lucideMoreVertical,
} from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Auth } from '@coaster/core';
import { AvatarBadge } from '../avatar-badge/avatar-badge';
import { CoasterTitle } from '../typography/typography';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [AvatarBadge, CoasterTitle, RouterLink, NgIcon, TranslatePipe],
  hostDirectives: [Toolbar],
  viewProviders: [
    provideIcons({
      lucideArrowRightLeft,
      lucideMoreVertical,
      lucideLogOut,
      lucideGlobe,
    }),
  ],
  host: {
    class:
      'fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-elevated',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-center justify-center gap-6">
      @if (image(); as image) {
        <coaster-avatar-badge [imageSrc]="image" altText="User profile" />
      }

      <h1 coaster-title>{{ label() }}</h1>
    </header>

    <div class="relative">
      <button
        (click)="toggleMenu()"
        class="text-on-surface-variant hover:text-primary transition-all active:scale-95 duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex items-center justify-center p-2 rounded-xl hover:bg-surface-container"
        aria-label="Open menu"
        [aria-expanded]="isMenuOpen()"
      >
        <ng-icon name="lucideMoreVertical" class="text-xl" />
      </button>

      @if (isMenuOpen()) {
        <!-- Backdrop to close dropdown on click outside -->
        <button
          class="fixed inset-0 z-40 w-full h-full bg-transparent cursor-default outline-none"
          (click)="closeMenu()"
          aria-label="Close menu"
        ></button>

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
            <ng-icon name="lucideArrowRightLeft" class="text-base text-on-surface-variant" />
            <span>{{ 'common.change_bar' | translate }}</span>
          </a>

          <div class="h-px bg-outline-variant/30 my-1"></div>

          <!-- Idioma Section -->
          <div class="flex flex-col gap-1 px-1.5 py-1">
            <div class="flex items-center gap-2 px-1.5 pb-1 text-xs font-bold tracking-wider text-on-surface-variant/60 uppercase">
              <ng-icon name="lucideGlobe" class="text-xs" />
              <span>{{ 'common.language' | translate }}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/20">
              <button
                (click)="setLanguage('es')"
                [class]="currentLang() === 'es' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'"
                class="flex items-center justify-center py-1 rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer outline-none"
              >
                ES
              </button>
              <button
                (click)="setLanguage('en')"
                [class]="currentLang() === 'en' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'"
                class="flex items-center justify-center py-1 rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer outline-none"
              >
                EN
              </button>
            </div>
          </div>

          <div class="h-px bg-outline-variant/30 my-1"></div>

          <!-- Cerrar sesión -->
          <button
            (click)="logout()"
            class="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-all active:scale-95 text-left cursor-pointer outline-none focus-visible:bg-error/10"
          >
            <ng-icon name="lucideLogOut" class="text-base" />
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
