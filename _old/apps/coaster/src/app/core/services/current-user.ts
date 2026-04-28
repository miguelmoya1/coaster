import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '@coaster/common';
import { firstValueFrom } from 'rxjs';
import { userMapper } from '../mappers/user.mapper';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class CurrentUser {
  readonly #auth = inject(Auth);
  readonly #http = inject(HttpClient);
  readonly #routes = {
    me: '/users/me',
  };

  readonly #current = httpResource(
    () => {
      if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
        return undefined;
      }

      return this.#routes.me;
    },
    {
      parse: (user) => userMapper(user),
    },
  );

  public readonly current = this.#current.asReadonly();

  public async syncUser(user: User) {
    if (this.#checkIfUserNeedToUpdate(user)) {
      return firstValueFrom(this.#http.patch(this.#routes.me, user));
    }

    return user;
  }

  #checkIfUserNeedToUpdate(user: User) {
    const firebaseProfile = this.#auth.userProfile();

    if (!firebaseProfile) {
      return false;
    }

    return user.name !== firebaseProfile.name || user.photoUrl !== firebaseProfile.photo;
  }
}
