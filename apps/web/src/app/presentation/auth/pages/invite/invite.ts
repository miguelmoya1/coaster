import { Component, inject, input, OnInit, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import type { InviteSummary } from '@coaster/common';
import { Auth, AuthRepository, getErrorMessage, handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../components/field/field';
import { PasswordReveal } from '../../../components/password-reveal/password-reveal';
import { FormErrors } from '../../../components/field/form-errors';
import { CoasterInput } from '../../../components/field/input.directive';
import { Spinner } from '../../../components/spinner/spinner';
import { AuthCard } from '../../components/auth-card';
import { GoogleButton } from '../../components/google-button';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Component({
  selector: 'coaster-invite',
  imports: [
    AuthCard,
    Spinner,
    MatButton,
    TranslatePipe,
    FormRoot,
    FormField,
    Field,
    FormErrors,
    CoasterInput,
    PasswordReveal,
    GoogleButton,
    RouterLink,
  ],
  template: `
    <coaster-auth-card
      testId="invite-card"
      [heading]="'auth.invite.heading' | translate"
      [subtitle]="invite()?.email ?? ''"
    >
      @if (loading()) {
        <div class="flex justify-center py-4"><coaster-spinner /></div>
      } @else if (error(); as code) {
        <p data-testid="invite-failed" class="text-error text-sm text-center" role="alert">{{ code | translate }}</p>
      } @else if (invite(); as summary) {
        @if (summary.hasCredentials) {
          <p data-testid="invite-already" class="text-on-surface-variant text-sm text-center">
            {{ 'auth.invite.already' | translate }}
          </p>
        } @else {
          <form [formRoot]="inviteForm" class="flex flex-col gap-5">
            <coaster-field
              [label]="'auth.fields.password' | translate"
              [hint]="'auth.fields.password_hint' | translate"
            >
              <coaster-password-reveal>
                <input
                  coasterInput
                  type="password"
                  autocomplete="new-password"
                  enterkeyhint="send"
                  data-testid="password-input"
                  [formField]="inviteForm.password"
                  [placeholder]="'auth.fields.password_placeholder' | translate"
                />
              </coaster-password-reveal>
            </coaster-field>

            <coaster-form-errors [errors]="inviteForm().errors()" />

            <button
              mat-flat-button
              type="submit"
              data-testid="invite-btn"
              class="w-full py-4 text-base font-medium rounded-full gap-2 whitespace-nowrap"
              [disabled]="inviteForm().submitting() || inviteForm().invalid()"
            >
              @if (inviteForm().submitting()) {
                <coaster-spinner />
              }
              {{ 'auth.invite.submit' | translate }}
            </button>
          </form>

          <coaster-google-button class="mt-6" (signedIn)="enter()" />
        }
      }

      <a footer routerLink="/login" data-testid="login-link" class="text-primary text-sm font-medium">
        {{ 'auth.forgot.back' | translate }}
      </a>
    </coaster-auth-card>
  `,
})
export default class Invite implements OnInit {
  public readonly token = input.required<string>();

  readonly #auth = inject(Auth);
  readonly #repo = inject(AuthRepository);
  readonly #router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly invite = signal<InviteSummary | null>(null);
  protected readonly error = signal('');
  protected readonly formModel = signal({ password: '' });

  async ngOnInit(): Promise<void> {
    try {
      this.invite.set(await this.#repo.invite(this.token()));
    } catch (error) {
      this.error.set(getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async enter(): Promise<void> {
    await this.#router.navigate(['/establishments/select']);
  }

  readonly inviteForm = form(
    this.formModel,
    (credentials) => {
      required(credentials.password);
      minLength(credentials.password, PASSWORD_MIN_LENGTH);
      maxLength(credentials.password, PASSWORD_MAX_LENGTH);
    },
    {
      submission: {
        action: async (form) => {
          try {
            await this.#auth.acceptInvite(this.token(), form().value().password);
            await this.enter();

            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );
}
