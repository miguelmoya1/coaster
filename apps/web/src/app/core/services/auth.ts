import { computed, inject, InjectionToken, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Language } from '@ngx-translate/core';
import {
  Auth as FirebaseAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  User,
} from 'firebase/auth';
import { Observable } from 'rxjs';

export const FIREBASE_AUTH = new InjectionToken<FirebaseAuth>('FIREBASE_AUTH');

export interface UserProfile {
  name: string;
  email: string;
  photo: string;
  language: string;
}

export function authState(auth: FirebaseAuth): Observable<User | null> {
  return new Observable<User | null>((subscriber) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
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
      (error) => subscriber.error(error),
    );
    return unsubscribe;
  });
}

@Service()
export class Auth {
  readonly #auth = inject(FIREBASE_AUTH);
  readonly #router = inject(Router);
  readonly #isTestMode = false;
  readonly #currentUser = signal<User | null | undefined>(undefined);
  readonly #token = signal<string | null | undefined>(undefined);
  readonly #user$ = authState(this.#auth);
  readonly #idToken$ = idToken(this.#auth);

  constructor() {
    // Escuchar cambios de estado
    this.#user$.subscribe((user) => {
      if (!this.#isTestMode) {
        this.#currentUser.set(user);
      }
    });
    this.#idToken$.subscribe((token) => {
      if (!this.#isTestMode) {
        this.#token.set(token);
      }
    });

    // Expose test helpers in non-production environments for E2E testing
    if (typeof window !== 'undefined' && !(window as any)._production) {
      (window as any).__TEST_LOGIN__ = async (token = 'fake-jwt-token', targetRoute = '/bars') => {
        (this as any).#isTestMode = true;
        this.#currentUser.set({ uid: 'test-user-123', email: 'test@coaster.com' } as any);
        this.#token.set(token);
        
        // Wait a tick for signals to propagate
        await new Promise(resolve => setTimeout(resolve, 10));

        await this.#router.navigateByUrl(targetRoute);
      };
      (window as any).__FIREBASE_AUTH__ = this.#auth;
    }
  }

  public readonly idToken = this.#token.asReadonly();
  public readonly isAuthLoaded = computed(() => {
    const user = this.#currentUser();
    const token = this.#token();
    if (user === undefined || token === undefined) {
      return false;
    }
    return user === null ? token === null : token !== null;
  });
  public readonly isAuthenticated = computed(() => !!this.#currentUser());
  public readonly userProfile = computed(() => {
    const user = this.#currentUser();

    if (!user) {
      return null;
    }

    const navLang = navigator.language.split('-')[0] as Language;

    const language = navLang === 'en' ? 'es' : navLang;

    const userReturn: UserProfile = {
      name: user.displayName ?? '',
      email: user.email ?? '',
      photo: user.photoURL ?? '',
      language,
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
