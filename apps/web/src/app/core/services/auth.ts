import { computed, inject, InjectionToken, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Language } from '@ngx-translate/core';
import {
  AuthError,
  Auth as FirebaseAuth,
  GoogleAuthProvider,
  OAuthCredential,
  OAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  User,
  UserCredential,
} from 'firebase/auth';
import { Observable } from 'rxjs';
import { AuthRepository } from '../data-access/auth-repository';
export const FIREBASE_AUTH = new InjectionToken<FirebaseAuth>('FIREBASE_AUTH');

export const SIGN_IN_PROVIDERS = {
  google: () => new GoogleAuthProvider(),
  apple: () => new OAuthProvider('apple.com'),
  microsoft: () => new OAuthProvider('microsoft.com'),
} as const;

export type SignInProvider = keyof typeof SIGN_IN_PROVIDERS;

export class AccountExistsWithDifferentProviderError extends Error {
  constructor(
    readonly email: string,
    readonly pendingCredential: OAuthCredential | null,
  ) {
    super('auth/account-exists-with-different-credential');
    this.name = 'AccountExistsWithDifferentProviderError';
  }
}

function asSignInError(error: unknown): unknown {
  if ((error as AuthError)?.code !== 'auth/account-exists-with-different-credential') {
    return error;
  }

  const authError = error as AuthError;

  return new AccountExistsWithDifferentProviderError(
    authError.customData?.email ?? '',
    OAuthProvider.credentialFromError(authError),
  );
}

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
  readonly #authRepo = inject(AuthRepository);
  #isTestMode = false;
  readonly #currentUser = signal<User | null | undefined>(undefined);
  readonly #token = signal<string | null | undefined>(undefined);
  readonly #user$ = authState(this.#auth);
  readonly #idToken$ = idToken(this.#auth);

  constructor() {
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

    if (typeof ngDevMode !== 'undefined' && ngDevMode && typeof window !== 'undefined') {
      (window as unknown as { __TEST_LOGIN__: (token: string, targetRoute: string) => Promise<void> }).__TEST_LOGIN__ =
        async (token = 'fake-jwt-token', targetRoute = '/establishments') => {
          this.#isTestMode = true;
          this.#currentUser.set({ uid: 'test-user-123', email: 'test@coaster.com' } as unknown as User);
          this.#token.set(token);

          await new Promise((resolve) => setTimeout(resolve, 10));

          await this.#router.navigateByUrl(targetRoute);
        };
      (window as unknown as { __FIREBASE_AUTH__: FirebaseAuth }).__FIREBASE_AUTH__ = this.#auth;
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

  public async login(provider: SignInProvider) {
    let credentials: UserCredential;

    try {
      credentials = await signInWithPopup(this.#auth, SIGN_IN_PROVIDERS[provider]());
    } catch (error) {
      throw asSignInError(error);
    }

    const token = await credentials.user.getIdToken();

    try {
      await this.#authRepo.syncUser(token);
    } catch (error) {
      await signOut(this.#auth);
      throw error;
    }

    return credentials.user;
  }

  public async logout() {
    await signOut(this.#auth);
  }
}
