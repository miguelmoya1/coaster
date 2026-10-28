import { HttpClient, httpResource } from '@angular/common/http';
import { computed, effect, inject, type Resource, Service } from '@angular/core';
import type { Language } from '../models/language.type';
import { Role } from '../models/role.type';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { type MappedUser, userMapper } from '../mappers/user.mapper';
import { Auth } from './auth';

@Service()
export class CurrentUser {
  readonly #auth = inject(Auth);
  readonly #http = inject(HttpClient);
  readonly #translate = inject(TranslateService);
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

  readonly #sessionUser = computed(() => {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return undefined;
    }

    const user = this.#auth.currentUser?.();
    return user ? userMapper(user) : undefined;
  });

  readonly #value = computed(() => (this.#current.hasValue() ? this.#current.value() : this.#sessionUser()));
  readonly #hasValue = computed(() => this.#current.hasValue() || this.#sessionUser() !== undefined);

  public readonly current: Resource<MappedUser | undefined> = {
    value: this.#value,
    status: this.#current.status,
    error: this.#current.error,
    isLoading: this.#current.isLoading,
    snapshot: this.#current.snapshot,
    hasValue: (() => this.#hasValue()) as Resource<MappedUser | undefined>['hasValue'],
  };

  public readonly isAdmin = computed(() => {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return false;
    }

    return this.current.value()?.role === Role.ADMIN;
  });

  constructor() {
    effect(() => {
      if (this.#current.hasValue()) {
        const fetchedUser = this.#current.value();

        if (fetchedUser) {
          this.#auth.patchUser?.({
            id: fetchedUser.id,
            email: fetchedUser.email,
            name: fetchedUser.name,
            photoUrl: fetchedUser.photoUrl,
            active: fetchedUser.active,
            role: fetchedUser.role,
            language: fetchedUser.language,
            emailVerified: fetchedUser.emailVerified,
          });
        }
      }

      if (!this.current.hasValue()) {
        return;
      }

      const user = this.current.value();

      if (user?.language) {
        this.#translate.use(user.language);
      }
    });
  }

  public async updateLanguage(language: string) {
    await firstValueFrom(this.#http.patch<void>(this.#routes.me, { language }));

    this.#auth.patchUser?.({ language: language as Language });
    this.#translate.use(language);
    this.#current.reload();
  }
}
