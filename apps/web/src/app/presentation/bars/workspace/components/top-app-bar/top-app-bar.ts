import { Component, inject, input } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AvatarBadge } from '../avatar-badge/avatar-badge';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [
    AvatarBadge,
    RouterLink,
    MatButton,
    MatIconButton,
    MatIcon,
    TranslatePipe,
    MatToolbar,
    MatMenuModule,
    MatDivider,
  ],
  host: {
    class: 'block w-full z-50 shrink-0',
  },
  template: `
    <mat-toolbar
      class="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-4 sm:px-6 h-16 w-full shadow-elevated"
    >
      <div class="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 mr-4">
        @if (image(); as image) {
          <coaster-avatar-badge [imageSrc]="image" altText="User profile" class="shrink-0" />
        }

        <h1 class="heading-1 font-black text-primary text-xl! sm:text-3xl! tracking-tighter truncate">
          {{ label() }}
        </h1>
      </div>

      <button mat-icon-button [matMenuTriggerFor]="menu" #menuTrigger="matMenuTrigger" aria-label="Open menu">
        <mat-icon>more_vert</mat-icon>
      </button>

      <mat-menu #menu="matMenu" xPosition="before" class="rounded-2xl!">
        <a mat-menu-item routerLink="/bars/select">
          <mat-icon>swap_horiz</mat-icon>
          <span>{{ 'common.change_bar' | translate }}</span>
        </a>

        <mat-divider />

        <div class="px-4 py-2 flex flex-col gap-2 outline-none">
          <div class="flex items-center gap-2 text-xs font-bold tracking-wider text-on-surface-variant/60 uppercase">
            <mat-icon class="text-xs">public</mat-icon>
            <span>{{ 'common.language' | translate }}</span>
          </div>

          <div class="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/20">
            @if (currentLang() === 'es') {
              <button mat-flat-button (click)="setLanguage('es'); menuTrigger.closeMenu()">ES</button>
            } @else {
              <button mat-button (click)="setLanguage('es'); menuTrigger.closeMenu()">ES</button>
            }
            @if (currentLang() === 'en') {
              <button mat-flat-button (click)="setLanguage('en'); menuTrigger.closeMenu()">EN</button>
            } @else {
              <button mat-button (click)="setLanguage('en'); menuTrigger.closeMenu()">EN</button>
            }
          </div>
        </div>

        <mat-divider />

        <button mat-menu-item (click)="logout()" class="text-error!">
          <mat-icon class="text-error!">logout</mat-icon>
          <span>{{ 'common.logout' | translate }}</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
})
export class TopAppBar {
  readonly label = input.required<string>();
  readonly image = input.required<string>();

  readonly #auth = inject(Auth);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);

  readonly currentLang = this.#translate.currentLang;

  setLanguage(lang: string): void {
    this.#translate.use(lang);
  }

  async logout(): Promise<void> {
    await this.#auth.logout();
    await this.#router.navigate(['/login'], { replaceUrl: true });
  }
}
