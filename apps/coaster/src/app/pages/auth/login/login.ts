import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../../core/services/auth';
import { PrimaryButton, SectionTitle, StatusCard } from '../../../shared';

@Component({
  selector: 'coaster-login',
  imports: [PrimaryButton, StatusCard, SectionTitle, TranslatePipe],
  template: `
    <coaster-section-title
      [heading]="'auth.login.brand' | translate"
      [description]="'auth.login.tagline' | translate"
      class="mb-16"
      isH1
    />

    <coaster-status-card
      status="success"
      class="min-w-52 max-w-96 w-full gap-4 h-64 justify-evenly items-center"
    >
      <div class="flex flex-col gap-2 justify-center items-center mb-8">
        <h2 class="text-2xl font-bold">
          {{ 'auth.login.heading' | translate }}
        </h2>
        <p class="text-on-surface-variant text-sm">
          {{ 'auth.login.subtitle' | translate }}
        </p>
      </div>

      <coaster-primary-button
        (click)="signIn()"
        [disabled]="isLoading()"
        class="w-full"
      >
        {{ 'auth.login.google_button' | translate }}
      </coaster-primary-button>
    </coaster-status-card>
  `,
  host: {
    class: 'flex flex-col gap-4 items-center justify-center h-full',
  },
})
export default class Login {
  readonly #auth = inject(Auth);
  readonly #router = inject(Router);

  protected readonly isLoading = signal(false);

  public async signIn() {
    this.isLoading.set(true);

    try {
      await this.#auth.loginWithGoogle();
      await this.#router.navigate(['/dashboard']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
