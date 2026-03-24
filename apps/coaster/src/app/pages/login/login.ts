import { Component, inject, signal } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { PrimaryButton, StatusCard } from '../../shared';

@Component({
  selector: 'coaster-login',
  imports: [PrimaryButton, StatusCard],
  template: `
    <coaster-status-card status="success">
      <h3 class="font-bold text-on-surface text-lg">Login</h3>
      <p class="text-on-surface-variant">Login with Google</p>
      <coaster-primary-button (click)="signIn()" [disabled]="isLoading()">
        {{ 'Login with Google' }}
      </coaster-primary-button>
    </coaster-status-card>
  `,
  host: {
    class: 'flex flex-col gap-4 items-center justify-center h-screen',
  },
})
export default class Login {
  readonly #auth = inject(Auth);
  protected readonly isLoading = signal(false);

  public async signIn() {
    this.isLoading.set(true);
    try {
      await this.#auth.loginWithGoogle();
    } finally {
      this.isLoading.set(false);
    }
  }
}
