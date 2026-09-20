import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { AccountSession, AccountSummary, AuthProvider } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class AccountRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    account: '/account',
    verifyEmail: '/account/verify-email',
    password: '/account/password',
    identities: '/account/identities',
    sessions: '/account/sessions',
  };

  public account(): Promise<AccountSummary> {
    return firstValueFrom(this.#http.get<AccountSummary>(this.routes.account));
  }

  public requestEmailVerification(): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.verifyEmail, {}));
  }

  public setPassword(password: string, currentPassword?: string): Promise<void> {
    return firstValueFrom(this.#http.put<void>(this.routes.password, { password, currentPassword }));
  }

  public sessions(): Promise<AccountSession[]> {
    return firstValueFrom(this.#http.get<AccountSession[]>(this.routes.sessions));
  }

  public closeSession(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.routes.sessions}/${id}`));
  }

  public closeOtherSessions(): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.sessions));
  }

  public unlink(provider: AuthProvider): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.routes.identities}/${provider}`));
  }
}
