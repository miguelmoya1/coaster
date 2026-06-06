import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionTitle } from '../../../components/section-title/section-title';
import { StatusCard } from '../../../components/status-card/status-card';
import { CoasterTitle } from '../../../components/typography/typography';

@Component({
  selector: 'coaster-login',
  imports: [CoasterTitle, StatusCard, SectionTitle, TranslatePipe, MatButton],
  host: {
    class: 'flex flex-col gap-4 items-center justify-center h-full',
  },
  template: `
    <coaster-section-title
      [heading]="'auth.login.brand' | translate"
      [description]="'auth.login.tagline' | translate"
      isH1
    />

    <coaster-status-card status="success" class="min-w-80 max-w-96 w-full">
      <div class="flex flex-col items-center gap-8 py-12">
        <h2 coaster-title>
          {{ 'auth.login.heading' | translate }}
        </h2>
        <p class="text-on-surface-variant text-sm text-center">
          {{ 'auth.login.subtitle' | translate }}
        </p>
      </div>

      <div class="flex flex-col gap-2 justify-center items-center">
        <button mat-flat-button class="h-16 w-full" (click)="signIn()" [disabled]="isLoading()">
          {{ 'auth.login.google_button' | translate }}
        </button>
      </div>
    </coaster-status-card>
  `,
})
export default class Login {
  readonly #auth = inject(Auth);
  readonly #router = inject(Router);

  protected readonly isLoading = signal(false);

  public async signIn() {
    this.isLoading.set(true);

    try {
      await this.#auth.loginWithGoogle();
      await this.#router.navigate(['/bars/select']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
