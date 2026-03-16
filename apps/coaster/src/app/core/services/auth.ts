import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  authState,
  Auth as FirebaseAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';

export type UserProfile = {
  name: string;
  email: string;
  photo: string;
};

@Injectable({
  providedIn: 'root',
})
export class Auth {
  readonly #auth = inject(FirebaseAuth);
  readonly #currentUser = toSignal(authState(this.#auth), {
    initialValue: undefined,
  });

  public readonly isAuthLoaded = computed(
    () => this.#currentUser() !== undefined,
  );
  public readonly isAuthenticated = computed(() => !!this.#currentUser());

  public readonly userProfile = computed(() => {
    const user = this.#currentUser();

    if (!user) {
      return null;
    }

    const userReturn: UserProfile = {
      name: user.displayName ?? '',
      email: user.email ?? '',
      photo: user.photoURL ?? '',
    };

    return userReturn;
  });

  public async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credendials = await signInWithPopup(this.#auth, provider);

    return credendials.user;
  }

  public async logout() {
    await signOut(this.#auth);
  }
}
