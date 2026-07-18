import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-login',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardActions,
    TranslatePipe,
    MatButton,
  ],
  host: {
    class: 'flex flex-col gap-6 items-center justify-center h-full w-full',
  },
  template: `
    <div class="flex flex-col gap-2 text-center mb-2">
      <h1 class="heading-1 font-bold text-primary">{{ 'auth.login.brand' | translate }}</h1>
      <p class="text-on-surface-variant text-sm">{{ 'auth.login.tagline' | translate }}</p>
    </div>

    <mat-card data-testid="login-card" class="relative overflow-hidden min-w-[320px] max-w-[400px] w-full p-6 shadow-md rounded-2xl">
      <div class="absolute top-0 left-0 w-full h-1 bg-primary"></div>

      <mat-card-header class="flex flex-col items-center justify-center text-center pb-4">
        <h2 mat-card-title class="heading-2 mb-1 w-full text-center">
          {{ 'auth.login.heading' | translate }}
        </h2>
        <p mat-card-subtitle class="text-on-surface-variant text-sm w-full text-center">
          {{ 'auth.login.subtitle' | translate }}
        </p>
      </mat-card-header>

      <mat-card-content class="flex flex-col items-center justify-center py-2">
        <div class="h-8"></div>
      </mat-card-content>

      <mat-card-actions align="end" class="w-full pt-2">
        <button
          mat-flat-button
          (click)="signIn()"
          [disabled]="isLoading()"
          data-testid="google-signin-btn"
          class="w-full py-4 text-base font-medium rounded-full"
        >
          {{ 'auth.login.google_button' | translate }}
        </button>
      </mat-card-actions>
    </mat-card>
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
