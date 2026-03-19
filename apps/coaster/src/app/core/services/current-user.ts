import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '@coaster/interfaces';
import { firstValueFrom } from 'rxjs';
import { ApiRoutes } from '../constants/api-routes';
import { userMapper } from '../mappers/user.mapper';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class CurrentUser {
  readonly #auth = inject(Auth);
  readonly #http = inject(HttpClient);s

  readonly #current = httpResource(
    () => {
      if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
        return undefined;
      }

      return ApiRoutes.USERS.ME;
    },
    {
      parse: userMapper,
    },
  );

  public readonly current = this.#current.asReadonly();

  public async syncUser(user: User) {
    if (this.#checkIfUserNeedToUpdate(user)) {
      return firstValueFrom(this.#http.patch(ApiRoutes.USERS.ME, user));
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
