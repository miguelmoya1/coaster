import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { AccountSummary } from '@coaster/common';
import { AccountRepository, getErrorMessage, handleErrorFormField, Toast } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../components/field/field';
import { FormErrors } from '../components/field/form-errors';
import { CoasterInput } from '../components/field/input.directive';
import { PageContainer } from '../components/page-container/page-container';
import { Spinner } from '../components/spinner/spinner';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Component({
  selector: 'coaster-account',
  imports: [
    Spinner,
    MatButton,
    MatIcon,
    TranslatePipe,
    FormRoot,
    FormField,
    Field,
    FormErrors,
    CoasterInput,
    PageContainer,
    RouterLink,
  ],
  template: `
    <coaster-page-container>
      <div class="flex flex-col gap-8 max-w-2xl mx-auto py-8">
        <div class="flex flex-col gap-1">
          <h1 class="heading-1 text-2xl font-bold">{{ 'account.heading' | translate }}</h1>
          <p class="text-on-surface-variant text-sm">{{ 'account.subtitle' | translate }}</p>
        </div>

        @if (account(); as summary) {
          <section class="flex flex-col gap-3 rounded-2xl border border-outline-variant/30 p-5">
            <h2 class="heading-2 text-lg font-semibold">{{ 'account.email.heading' | translate }}</h2>

            <p class="text-on-surface-variant text-sm" data-testid="account-email">{{ summary.email }}</p>

            @if (summary.emailVerified) {
              <p class="text-sm flex items-center gap-2" data-testid="email-verified">
                <mat-icon class="text-primary text-base!">check_circle</mat-icon>
                {{ 'account.email.verified' | translate }}
              </p>
            } @else {
              <p class="text-sm text-on-surface-variant" data-testid="email-unverified">
                {{ 'account.email.unverified' | translate }}
              </p>
              <button
                mat-stroked-button
                type="button"
                data-testid="verify-btn"
                class="self-start rounded-full"
                [disabled]="sending()"
                (click)="requestVerification()"
              >
                @if (sending()) {
                  <coaster-spinner />
                }
                {{ 'account.email.send' | translate }}
              </button>
            }
          </section>

          <section class="flex flex-col gap-4 rounded-2xl border border-outline-variant/30 p-5">
            <h2 class="heading-2 text-lg font-semibold">
              {{ (summary.hasPassword ? 'account.password.change' : 'account.password.set') | translate }}
            </h2>

            <form [formRoot]="passwordForm" class="flex flex-col gap-4">
              @if (summary.hasPassword) {
                <coaster-field [label]="'account.password.current' | translate">
                  <input
                    coasterInput
                    type="password"
                    autocomplete="current-password"
                    data-testid="current-password-input"
                    [formField]="passwordForm.currentPassword"
                  />
                </coaster-field>
              }

              <coaster-field
                [label]="'auth.fields.new_password' | translate"
                [hint]="'auth.fields.password_hint' | translate"
              >
                <input
                  coasterInput
                  type="password"
                  autocomplete="new-password"
                  enterkeyhint="send"
                  data-testid="new-password-input"
                  [formField]="passwordForm.password"
                />
              </coaster-field>

              <coaster-form-errors [errors]="passwordForm().errors()" />

              <button
                mat-flat-button
                type="submit"
                data-testid="password-btn"
                class="self-start rounded-full px-6"
                [disabled]="passwordForm().submitting() || passwordForm().invalid()"
              >
                @if (passwordForm().submitting()) {
                  <coaster-spinner />
                }
                {{ 'common.save' | translate }}
              </button>
            </form>
          </section>

          <section class="flex flex-col gap-4 rounded-2xl border border-outline-variant/30 p-5">
            <h2 class="heading-2 text-lg font-semibold">{{ 'account.identities.heading' | translate }}</h2>

            @if (summary.identities.length === 0) {
              <p class="text-on-surface-variant text-sm" data-testid="no-identities">
                {{ 'account.identities.none' | translate }}
              </p>
            } @else {
              @for (identity of summary.identities; track identity.provider) {
                <div class="flex items-center justify-between gap-4" [attr.data-testid]="'identity-' + identity.provider">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ 'account.identities.' + identity.provider.toLowerCase() | translate }}</span>
                    <span class="text-on-surface-variant text-xs">{{ identity.email }}</span>
                  </div>

                  <button
                    mat-stroked-button
                    type="button"
                    class="rounded-full text-error!"
                    [attr.data-testid]="'unlink-' + identity.provider"
                    [disabled]="unlinking()"
                    (click)="unlink(identity.provider)"
                  >
                    {{ 'account.identities.unlink' | translate }}
                  </button>
                </div>
              }
            }
          </section>
        } @else if (failed()) {
          <p class="text-error text-sm" role="alert">{{ failed() | translate }}</p>
        } @else {
          <div class="flex justify-center py-8"><coaster-spinner /></div>
        }

        <a routerLink="/establishments/select" class="text-primary text-sm font-medium">
          {{ 'account.back' | translate }}
        </a>
      </div>
    </coaster-page-container>
  `,
})
export default class Account {
  readonly #repo = inject(AccountRepository);
  readonly #toast = inject(Toast);

  protected readonly account = signal<AccountSummary | null>(null);
  protected readonly failed = signal('');
  protected readonly sending = signal(false);
  protected readonly unlinking = signal(false);
  protected readonly formModel = signal({ password: '', currentPassword: '' });

  constructor() {
    void this.#load();
  }

  readonly passwordForm = form(
    this.formModel,
    (credentials) => {
      required(credentials.password);
      minLength(credentials.password, PASSWORD_MIN_LENGTH);
      maxLength(credentials.password, PASSWORD_MAX_LENGTH);
    },
    {
      submission: {
        action: async (form) => {
          const { password, currentPassword } = form().value();

          try {
            await this.#repo.setPassword(password, currentPassword || undefined);
            this.formModel.set({ password: '', currentPassword: '' });
            this.#toast.success('account.password.saved');
            await this.#load();

            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected async requestVerification(): Promise<void> {
    this.sending.set(true);

    try {
      await this.#repo.requestEmailVerification();
      this.#toast.success('account.email.sent');
    } finally {
      this.sending.set(false);
    }
  }

  protected async unlink(provider: AccountSummary['identities'][number]['provider']): Promise<void> {
    this.unlinking.set(true);

    try {
      await this.#repo.unlink(provider);
      await this.#load();
    } finally {
      this.unlinking.set(false);
    }
  }

  async #load(): Promise<void> {
    try {
      this.account.set(await this.#repo.account());
    } catch (error) {
      this.failed.set(getErrorMessage(error));
    }
  }
}
