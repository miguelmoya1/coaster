import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../../core';
import { CoasterBtn, CoasterTitle, SectionTitle, StatusCard } from '../../../shared';

@Component({
  selector: 'coaster-login',
  imports: [CoasterBtn, CoasterTitle, StatusCard, SectionTitle, TranslatePipe],
  templateUrl: './login.html',
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
      await this.#router.navigate(['/bars/select']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
