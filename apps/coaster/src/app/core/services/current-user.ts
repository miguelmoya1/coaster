import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { userMapper } from '../mappers/user.mapper';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class CurrentUser {
  readonly #auth = inject(Auth);

  readonly #current = httpResource(
    () => {
      if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
        return undefined;
      }

      return 'users/me';
    },
    {
      parse: userMapper,
    },
  );

  public readonly current = this.#current.asReadonly();

  public async syncUser() {
    const firebaseProfile = this.#auth.userProfile();

    if (!firebaseProfile) {
      return;
    }

    const hasValue = this.#current.hasValue();

    if (hasValue) {
      return;
    }

    const user = this.#current.value();

    if (!user) {
      return;
    }

    if (user.email !== firebaseProfile.email || user.name !== firebaseProfile.name || firebaseProfile.photo ) {
      await this.#auth.logout();
    }
  }
}
