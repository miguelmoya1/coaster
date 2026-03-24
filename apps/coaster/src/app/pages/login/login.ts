import { Component, inject, signal } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { PrimaryButtonComponent } from '../../shared';

@Component({
  selector: 'coaster-login',
  imports: [PrimaryButtonComponent],
  template: `
    <coaster-primary-button (click)="signIn()" [disabled]="isLoading()">
      {{ 'Login with Google' }}
    </coaster-primary-button>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
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
