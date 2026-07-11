import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Service()
export class AuthRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    login: '/auth/login',
  };

  public async syncUser(token: string): Promise<void> {
    await firstValueFrom(
      this.#http.post<void>(this.routes.login, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
  }
}
