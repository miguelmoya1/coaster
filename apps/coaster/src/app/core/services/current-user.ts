import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '@coaster/interfaces';
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
      console.log(
        'current user',
        this.#auth.isAuthLoaded(),
        this.#auth.isAuthenticated(),
      );
      if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
        console.log('current user', 'undefined');
        return undefined;
      }

      console.log('current user', this.#routes.me);
      return this.#routes.me;
    },
    {
      parse: userMapper,
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

    return (
      user.name !== firebaseProfile.name ||
      user.photoUrl !== firebaseProfile.photo
    );
  }
}
