import { HttpClient, httpResource } from '@angular/common/http';
import { computed, effect, inject, Service } from '@angular/core';
import { Role } from '@coaster/common';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { userMapper } from '../mappers/user.mapper';
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

  public readonly current = this.#current.asReadonly();

  public readonly isAdmin = computed(() => {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return false;
    }

    return this.#current.value()?.role === Role.ADMIN;
  });

  constructor() {
    effect(() => {
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

    this.#translate.use(language);
    this.#current.reload();
  }

}
