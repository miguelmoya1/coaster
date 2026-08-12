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
import { ButtonSpinner } from '../../../components/button-spinner/button-spinner';
import { PageContainer } from '../../../components/page-container/page-container';

@Component({
  selector: 'coaster-login',
  imports: [
    ButtonSpinner,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardActions,
    TranslatePipe,
    MatButton,
    PageContainer,
  ],
  host: {
    class: 'min-h-screen w-full flex flex-col justify-center items-center bg-background',
  },
  template: `
    <coaster-page-container>
      <div class="flex flex-col items-center justify-center min-h-[80vh]">
        <div class="flex flex-col gap-2 text-center mb-6">
          <h1 class="heading-1 font-extrabold text-primary text-3xl sm:text-4xl tracking-tight">
            {{ 'auth.login.brand' | translate }}
          </h1>
          <p class="text-on-surface-variant text-sm sm:text-base">{{ 'auth.login.tagline' | translate }}</p>
        </div>

        <mat-card
          data-testid="login-card"
          class="relative overflow-hidden w-full p-6 sm:p-8 shadow-xl rounded-3xl border border-outline-variant/30"
        >
          <div class="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>

          <mat-card-header class="flex flex-col items-center justify-center text-center pb-4">
            <h2 mat-card-title class="heading-2 mb-1 w-full text-center text-xl font-bold">
              {{ 'auth.login.heading' | translate }}
            </h2>
            <p mat-card-subtitle class="text-on-surface-variant text-sm w-full text-center">
              {{ 'auth.login.subtitle' | translate }}
            </p>
          </mat-card-header>

          <mat-card-content class="flex flex-col items-center justify-center py-4"> </mat-card-content>

          <mat-card-actions align="end" class="w-full pt-2">
            <button
              mat-flat-button
              (click)="signIn()"
              [disabled]="isLoading()"
              data-testid="google-signin-btn"
              class="w-full py-4 text-base font-medium rounded-full"
            >
              @if (isLoading()) {
                <coaster-button-spinner class="mr-2" />
              }
              {{ 'auth.login.google_button' | translate }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </coaster-page-container>
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
      await this.#router.navigate(['/establishments/select']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
