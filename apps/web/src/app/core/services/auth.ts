import { computed, inject, Service, signal } from '@angular/core';
import type { AuthSession } from '@coaster/common';
import { AuthRepository, Credentials, Registration } from '../data-access/auth-repository';

@Service()
export class Auth {
  readonly #repo = inject(AuthRepository);

  readonly #session = signal<AuthSession | null | undefined>(undefined);

  #refreshing: Promise<string | null> | null = null;

  public readonly accessToken = computed(() => this.#session()?.accessToken ?? null);
  public readonly isAuthLoaded = computed(() => this.#session() !== undefined);
  public readonly isAuthenticated = computed(() => Boolean(this.#session()));
  public readonly currentUser = computed(() => this.#session()?.user ?? null);

  public async ensureRestored(): Promise<void> {
    if (this.#session() === undefined) {
      await this.refresh();
    }
  }

  public async register(registration: Registration): Promise<void> {
    this.#session.set(await this.#repo.register(registration));
  }

  public async login(credentials: Credentials): Promise<void> {
    this.#session.set(await this.#repo.login(credentials));
  }

  public async loginWithGoogle(credential: string): Promise<void> {
    this.#session.set(await this.#repo.google(credential));
  }

  public async resetPassword(token: string, password: string): Promise<void> {
    this.#session.set(await this.#repo.resetPassword(token, password));
  }

  public async acceptInvite(token: string, password: string): Promise<void> {
    this.#session.set(await this.#repo.acceptInvite(token, password));
  }

  public async logout(): Promise<void> {
    try {
      await this.#repo.logout();
    } finally {
      this.#session.set(null);
    }
  }

  public refresh(): Promise<string | null> {
    this.#refreshing ??= this.#refreshOnce();

    return this.#refreshing;
  }

  async #refreshOnce(): Promise<string | null> {
    try {
      const session = await this.#repo.refresh();

      this.#session.set(session);

      return session.accessToken;
    } catch {
      this.#session.set(null);

      return null;
    } finally {
      this.#refreshing = null;
    }
  }
}
