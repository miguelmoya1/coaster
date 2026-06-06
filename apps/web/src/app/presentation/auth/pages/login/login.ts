import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardSubtitle } from '@angular/material/card';


@Component({
  selector: 'coaster-login',
  imports: [MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardSubtitle, TranslatePipe, MatButton],
  host: {
    class: 'flex flex-col gap-4 items-center justify-center h-full',
  },
  template: `
    <div class="flex flex-col gap-2">
      <h1 class="heading-1">{{ 'auth.login.brand' | translate }}</h1>
      <p class="text-on-surface-variant text-sm">{{ 'auth.login.tagline' | translate }}</p>
    </div>

    <mat-card class="relative overflow-hidden min-w-80 max-w-96 w-full p-6">
      <div class="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
      <mat-card-header class="flex flex-col items-center gap-2 pb-8 p-0">
        <h2 mat-card-title class="heading-2 text-center">
          {{ 'auth.login.heading' | translate }}
        </h2>
        <p mat-card-subtitle class="text-on-surface-variant text-sm text-center">
          {{ 'auth.login.subtitle' | translate }}
        </p>
      </mat-card-header>
      <mat-card-content class="flex flex-col gap-2 justify-center items-center p-0">
        <button mat-flat-button class="h-16 px-8 min-w-[240px]" (click)="signIn()" [disabled]="isLoading()">
          {{ 'auth.login.google_button' | translate }}
        </button>
      </mat-card-content>
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
