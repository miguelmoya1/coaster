import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { AuthSession, InviteSummary } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
  language?: string;
}

@Service()
export class AuthRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    register: '/auth/register',
    login: '/auth/login',
    google: '/auth/google',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    invite: '/auth/invite',
  };

  public register(registration: Registration): Promise<AuthSession> {
    return firstValueFrom(
      this.#http.post<AuthSession>(this.routes.register, registration, { withCredentials: true }),
    );
  }

  public login(credentials: Credentials): Promise<AuthSession> {
    return firstValueFrom(this.#http.post<AuthSession>(this.routes.login, credentials, { withCredentials: true }));
  }

  public google(credential: string): Promise<AuthSession> {
    return firstValueFrom(this.#http.post<AuthSession>(this.routes.google, { credential }, { withCredentials: true }));
  }

  public refresh(): Promise<AuthSession> {
    return firstValueFrom(this.#http.post<AuthSession>(this.routes.refresh, {}, { withCredentials: true }));
  }

  public forgotPassword(email: string): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.forgotPassword, { email }));
  }

  public resetPassword(token: string, password: string): Promise<AuthSession> {
    return firstValueFrom(
      this.#http.post<AuthSession>(this.routes.resetPassword, { token, password }, { withCredentials: true }),
    );
  }

  public verifyEmail(token: string): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.verifyEmail, { token }));
  }

  public invite(token: string): Promise<InviteSummary> {
    return firstValueFrom(this.#http.get<InviteSummary>(`${this.routes.invite}/${token}`));
  }

  public acceptInvite(token: string, password: string): Promise<AuthSession> {
    return firstValueFrom(
      this.#http.post<AuthSession>(this.routes.invite, { token, password }, { withCredentials: true }),
    );
  }

  public logout(): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.logout, {}, { withCredentials: true }));
  }
}
