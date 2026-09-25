import { Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { AccountSession, AccountSummary } from '@coaster/common';
import {
  AccountRepository,
  DateFormatterService,
  describeUserAgent,
  getErrorMessage,
  handleErrorFormField,
  type PageResource,
  Toast,
} from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../components/confirm-dialog/confirmation-dialog.service';
import { Field } from '../components/field/field';
import { FormErrors } from '../components/field/form-errors';
import { CoasterInput } from '../components/field/input.directive';
import { PasswordReveal } from '../components/password-reveal/password-reveal';
import { Spinner } from '../components/spinner/spinner';
import { UsernameHint } from '../components/username-hint/username-hint';

interface Device {
  id: string;
  current: boolean;
  icon: string;
  name: string;
  ip: string | null;
  lastUsed: string;
}

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
    PasswordReveal,
    UsernameHint,
    RouterLink,
  ],
  host: { class: 'block min-h-dvh bg-background' },
  template: `
    <div class="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-on-surface text-3xl font-black tracking-tight">{{ 'account.heading' | translate }}</h1>
          <p class="text-on-surface-variant text-sm">{{ 'account.subtitle' | translate }}</p>
        </div>

        <a
          routerLink="/establishments/select"
          class="text-on-surface-variant hover:text-primary flex items-center gap-1.5 text-sm transition-colors"
        >
          <mat-icon class="text-base!">arrow_back</mat-icon>
          {{ 'account.back' | translate }}
        </a>
      </header>

      @if (summary(); as summary) {
        <div class="grid items-start gap-6 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-6">
            <section
              class="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-surface-container-low/70 p-6 backdrop-blur-xs"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex flex-col gap-1">
                  <h2 class="text-on-surface text-base font-semibold">{{ 'account.email.heading' | translate }}</h2>
                  <p class="text-on-surface-variant text-sm break-all" data-testid="account-email">
                    {{ summary.email }}
                  </p>
                </div>

                @if (summary.emailVerified) {
                  <span
                    data-testid="email-verified"
                    class="bg-primary/15 text-primary flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    <mat-icon class="text-sm!">check_circle</mat-icon>
                    {{ 'account.email.verified' | translate }}
                  </span>
                }
              </div>

              @if (!summary.emailVerified) {
                <p class="text-on-surface-variant text-sm" data-testid="email-unverified">
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

            <section
              class="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-surface-container-low/70 p-6 backdrop-blur-xs"
            >
              <h2 class="text-on-surface text-base font-semibold">{{ 'account.identities.heading' | translate }}</h2>

              @if (isOnlyWayIn(summary)) {
                <p class="text-on-surface-variant text-sm" data-testid="only-way-in">
                  {{ 'account.identities.only_way_in' | translate }}
                </p>
              }

              @if (summary.identities.length === 0) {
                <p class="text-on-surface-variant text-sm" data-testid="no-identities">
                  {{ 'account.identities.none' | translate }}
                </p>
              } @else {
                @for (identity of summary.identities; track identity.provider) {
                  <div
                    class="border-outline-variant/30 flex min-w-0 items-center justify-between gap-4 rounded-xl border p-3"
                    [attr.data-testid]="'identity-' + identity.provider"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <span
                        class="bg-surface-container-highest flex size-9 shrink-0 items-center justify-center rounded-full"
                      >
                        <mat-icon class="text-on-surface-variant text-lg!">link</mat-icon>
                      </span>

                      <div class="flex min-w-0 flex-col">
                        <span class="text-on-surface text-sm font-medium">
                          {{ 'account.identities.' + identity.provider.toLowerCase() | translate }}
                        </span>
                        <span class="text-on-surface-variant truncate text-xs">{{ identity.email }}</span>
                      </div>
                    </div>

                    <button
                      mat-stroked-button
                      type="button"
                      class="text-error! shrink-0 rounded-full"
                      [attr.data-testid]="'unlink-' + identity.provider"
                      [disabled]="unlinking() || isOnlyWayIn(summary)"
                      (click)="unlink(identity.provider)"
                    >
                      {{ 'account.identities.unlink' | translate }}
                    </button>
                  </div>
                }
              }
            </section>
          </div>

          <section
            class="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-surface-container-low/70 p-6 backdrop-blur-xs"
          >
            <h2 class="text-on-surface text-base font-semibold">
              {{ (summary.hasPassword ? 'account.password.change' : 'account.password.set') | translate }}
            </h2>

            @if (!summary.hasPassword) {
              <p class="text-on-surface-variant text-sm">{{ 'account.password.none_yet' | translate }}</p>
            }

            <form [formRoot]="passwordForm" class="flex flex-col gap-4">
              <coaster-username-hint [email]="summary.email" />
              @if (summary.hasPassword) {
                <coaster-field [label]="'account.password.current' | translate">
                  <coaster-password-reveal>
                    <input
                      coasterInput
                      type="password"
                      autocomplete="current-password"
                      data-testid="current-password-input"
                      [formField]="passwordForm.currentPassword"
                    />
                  </coaster-password-reveal>
                </coaster-field>
              }

              <coaster-field
                [label]="'auth.fields.new_password' | translate"
                [hint]="'auth.fields.password_hint' | translate"
              >
                <coaster-password-reveal>
                  <input
                    coasterInput
                    type="password"
                    autocomplete="new-password"
                    enterkeyhint="send"
                    data-testid="new-password-input"
                    [formField]="passwordForm.password"
                  />
                </coaster-password-reveal>
              </coaster-field>

              <coaster-form-errors [errors]="passwordForm().errors()" />

              <button
                mat-flat-button
                type="submit"
                data-testid="password-btn"
                class="h-11 self-start rounded-full px-6"
                [disabled]="passwordForm().submitting() || passwordForm().invalid()"
              >
                @if (passwordForm().submitting()) {
                  <coaster-spinner />
                }
                {{ 'common.save' | translate }}
              </button>
            </form>

            <p class="text-on-surface-variant border-outline-variant/30 border-t pt-4 text-xs">
              {{ 'account.password.closes_others' | translate }}
            </p>
          </section>
        </div>
        <section
          class="mt-6 flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-surface-container-low/70 p-6 backdrop-blur-xs"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex flex-col gap-1">
              <h2 class="text-on-surface text-base font-semibold">{{ 'account.sessions.heading' | translate }}</h2>
              <p class="text-on-surface-variant text-sm">{{ 'account.sessions.subtitle' | translate }}</p>
            </div>

            @if (others() > 0) {
              <button
                mat-stroked-button
                type="button"
                data-testid="close-others-btn"
                class="text-error! shrink-0 rounded-full"
                [disabled]="closing() !== ''"
                (click)="closeOthers()"
              >
                @if (closing() === OTHERS) {
                  <coaster-spinner />
                }
                {{ 'account.sessions.close_others' | translate }}
              </button>
            }
          </div>

          @if (sessionList() === null) {
            <div class="flex justify-center py-6"><coaster-spinner /></div>
          } @else {
            @for (device of devices(); track device.id) {
              <div
                class="border-outline-variant/30 flex min-w-0 items-center justify-between gap-4 rounded-xl border p-3"
                [attr.data-testid]="'session-' + device.id"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <span
                    class="bg-surface-container-highest flex size-9 shrink-0 items-center justify-center rounded-full"
                  >
                    <mat-icon class="text-on-surface-variant text-lg!">{{ device.icon }}</mat-icon>
                  </span>

                  <div class="flex min-w-0 flex-col">
                    <span class="text-on-surface flex flex-wrap items-center gap-2 text-sm font-medium">
                      {{ device.name || ('account.sessions.unknown_device' | translate) }}

                      @if (device.current) {
                        <span
                          class="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
                          [attr.data-testid]="'session-current-' + device.id"
                        >
                          {{ 'account.sessions.current' | translate }}
                        </span>
                      }
                    </span>

                    <span class="text-on-surface-variant truncate text-xs">
                      {{ 'account.sessions.last_used' | translate: { when: device.lastUsed } }}
                      @if (device.ip) {
                        · {{ device.ip }}
                      }
                    </span>
                  </div>
                </div>

                @if (!device.current) {
                  <button
                    mat-stroked-button
                    type="button"
                    class="text-error! shrink-0 rounded-full"
                    [attr.data-testid]="'close-session-' + device.id"
                    [disabled]="closing() !== ''"
                    (click)="close(device)"
                  >
                    {{ 'account.sessions.close' | translate }}
                  </button>
                }
              </div>
            } @empty {
              <p class="text-on-surface-variant text-sm" data-testid="no-sessions">
                {{ 'account.sessions.none' | translate }}
              </p>
            }
          }
        </section>
      } @else if (failed()) {
        <p class="text-error text-sm" role="alert">{{ failed() | translate }}</p>
      } @else {
        <div class="flex justify-center py-16"><coaster-spinner /></div>
      }
    </div>
  `,
})
export default class Account {
  readonly #repo = inject(AccountRepository);
  readonly #toast = inject(Toast);
  readonly #dates = inject(DateFormatterService);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #translate = inject(TranslateService);

  protected readonly OTHERS = 'others';

  public readonly account = input.required<PageResource<AccountSummary>>();
  public readonly sessions = input.required<PageResource<AccountSession[]>>();

  protected readonly summary = computed(() => {
    const account = this.account();
    return account.hasValue() ? (account.value() ?? null) : null;
  });
  protected readonly failed = computed(() => {
    const error = this.account().error();
    return error ? getErrorMessage(error) : '';
  });
  protected readonly sending = signal(false);
  protected readonly unlinking = signal(false);
  protected readonly formModel = signal({ password: '', currentPassword: '' });
  protected readonly sessionList = computed<AccountSession[] | null>(() => {
    const sessions = this.sessions();

    if (sessions.status() === 'error') {
      return [];
    }

    return sessions.hasValue() ? (sessions.value() ?? []) : null;
  });
  protected readonly closing = signal('');

  protected readonly devices = computed<Device[]>(() =>
    (this.sessionList() ?? []).map((session) => this.#device(session)),
  );
  protected readonly others = computed(() => this.devices().filter((device) => !device.current).length);

  readonly passwordForm = form(
    this.formModel,
    (credentials) => {
      required(credentials.currentPassword, { when: () => this.summary()?.hasPassword === true });
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
            form().reset({ password: '', currentPassword: '' });
            this.#toast.success('account.password.saved');
            this.account().reload();

            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected async close(device: Device): Promise<void> {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('account.sessions.close_dialog.title'),
      text: this.#translate.instant('account.sessions.close_dialog.message', {
        device: device.name || this.#translate.instant('account.sessions.unknown_device'),
      }),
      confirmLabel: 'account.sessions.close',
    });

    if (!confirmed) {
      return;
    }

    this.closing.set(device.id);

    try {
      await this.#repo.closeSession(device.id);
      this.#toast.success('account.sessions.closed');
      this.sessions().reload();
    } catch (error) {
      this.#toast.error(getErrorMessage(error));
    } finally {
      this.closing.set('');
    }
  }

  protected async closeOthers(): Promise<void> {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('account.sessions.close_others_dialog.title'),
      text: this.#translate.instant('account.sessions.close_others_dialog.message'),
      confirmLabel: 'account.sessions.close_others',
    });

    if (!confirmed) {
      return;
    }

    this.closing.set(this.OTHERS);

    try {
      await this.#repo.closeOtherSessions();
      this.#toast.success('account.sessions.others_closed');
      this.sessions().reload();
    } catch (error) {
      this.#toast.error(getErrorMessage(error));
    } finally {
      this.closing.set('');
    }
  }

  protected isOnlyWayIn(summary: AccountSummary): boolean {
    return !summary.hasPassword && summary.identities.length === 1;
  }

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
      this.account().reload();
    } finally {
      this.unlinking.set(false);
    }
  }

  #device(session: AccountSession): Device {
    const { browser, platform } = describeUserAgent(session.userAgent);

    return {
      id: session.id,
      current: session.current,
      icon: this.#icon(platform),
      name: [browser, platform].filter(Boolean).join(' · '),
      ip: session.ip,
      lastUsed: this.#dates.formatSince(session.lastUsedAt),
    };
  }

  #icon(platform: string | null): string {
    if (platform === 'iPhone' || platform === 'Android') {
      return 'smartphone';
    }

    return platform === 'iPad' ? 'tablet' : 'computer';
  }
}
