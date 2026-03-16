import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '@coaster/interfaces';
import { firstValueFrom } from 'rxjs';
import { userMapper } from '../mappers/user.mapper';
import { Auth, UserProfile } from './auth';

@Injectable({
  providedIn: 'root',
})
export class CurrentUser {
  readonly #auth = inject(Auth);
  readonly #http = inject(HttpClient);

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

    if (this.#checkIfUserNeedToUpdate(user, firebaseProfile)) {
      return firstValueFrom(this.#http.patch('users/me', firebaseProfile));
    }

    return user;
  }

  #checkIfUserNeedToUpdate(user: User, firebaseProfile: UserProfile) {
    return (
      user.email !== firebaseProfile.email ||
      user.name !== firebaseProfile.name ||
      user.photoUrl !== firebaseProfile.photo
    );
  }
}
