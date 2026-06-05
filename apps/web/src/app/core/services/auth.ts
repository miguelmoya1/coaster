import { computed, inject, InjectionToken, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  Auth as FirebaseAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';

export const FIREBASE_AUTH = new InjectionToken<FirebaseAuth>('FIREBASE_AUTH');

export interface UserProfile {
  name: string;
  email: string;
  photo: string;
}

export function authState(auth: FirebaseAuth): Observable<User | null> {
  return new Observable<User | null>((subscriber) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error)
    );
    return unsubscribe;
  });
}

export function idToken(auth: FirebaseAuth): Observable<string | null> {
  return new Observable<string | null>((subscriber) => {
    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            subscriber.next(token);
          } catch (error) {
            subscriber.error(error);
          }
        } else {
          subscriber.next(null);
        }
      },
      (error) => subscriber.error(error)
    );
    return unsubscribe;
  });
}

@Service()
export class Auth {
  readonly #auth = inject(FIREBASE_AUTH);
  readonly #currentUser = toSignal(authState(this.#auth), {
    initialValue: undefined,
    requireSync: false,
  });

  public readonly idToken = toSignal(idToken(this.#auth), {
    initialValue: undefined,
    requireSync: false,
  });
  public readonly isAuthLoaded = computed(() => this.#currentUser() !== undefined);
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
    const credentials = await signInWithPopup(this.#auth, provider);

    return credentials.user;
  }

  public async logout() {
    await signOut(this.#auth);
  }
}
