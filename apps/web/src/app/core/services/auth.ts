import { computed, effect, inject, Service, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { AuthSession } from '../models/auth.interface';
import type { User } from '../models/user.interface';
import { AuthRepository, Credentials, Registration } from '../data-access/auth-repository';

@Service()
export class Auth {
  readonly #repo = inject(AuthRepository);
  readonly #translate = inject(TranslateService, { optional: true });

  readonly #session = signal<AuthSession | null | undefined>(undefined);

  #refreshing: Promise<string | null> | null = null;
  #generation = 0;

  public readonly accessToken = computed(() => this.#session()?.accessToken ?? null);
  public readonly isAuthLoaded = computed(() => this.#session() !== undefined);
  public readonly isAuthenticated = computed(() => Boolean(this.#session()));
  public readonly currentUser = computed(() => this.#session()?.user ?? null);

  constructor() {
    effect(() => {
      const language = this.currentUser()?.language;

      if (language) {
        this.#translate?.use(language);
      }
    });
  }

  public async ensureRestored(): Promise<void> {
    if (this.#session() === undefined) {
      await this.refresh();
    }
  }

  public async register(registration: Registration): Promise<void> {
    this.#setSession(await this.#repo.register(registration));
  }

  public async login(credentials: Credentials): Promise<void> {
    this.#setSession(await this.#repo.login(credentials));
  }

  public async loginWithGoogle(credential: string): Promise<void> {
    this.#setSession(await this.#repo.google(credential));
  }

  public async resetPassword(token: string, password: string): Promise<void> {
    this.#setSession(await this.#repo.resetPassword(token, password));
  }

  public async acceptInvite(token: string, password: string): Promise<void> {
    this.#setSession(await this.#repo.acceptInvite(token, password));
  }

  public patchUser(changes: Partial<User>): void {
    this.#session.update((session) => (session ? { ...session, user: { ...session.user, ...changes } } : session));
  }

  public async logout(): Promise<void> {
    this.#generation += 1;
    this.#refreshing = null;

    try {
      await this.#repo.logout();
    } finally {
      this.#setSession(null);
    }
  }

  public refresh(): Promise<string | null> {
    this.#refreshing ??= this.#refreshOnce(this.#generation);

    return this.#refreshing;
  }

  #setSession(session: AuthSession | null): void {
    this.#generation += 1;
    this.#refreshing = null;
    this.#session.set(session);
  }

  async #refreshOnce(generation: number): Promise<string | null> {
    try {
      const session = await this.#repo.refresh();

      if (generation !== this.#generation) {
        return this.accessToken();
      }

      this.#session.set(session);

      return session.accessToken;
    } catch {
      if (generation === this.#generation) {
        this.#session.set(null);
      }

      return null;
    } finally {
      if (generation === this.#generation) {
        this.#refreshing = null;
      }
    }
  }
}
