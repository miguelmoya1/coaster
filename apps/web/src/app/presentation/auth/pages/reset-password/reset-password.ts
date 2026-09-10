import { Component, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { Auth, handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../components/field/field';
import { PasswordReveal } from '../../../components/password-reveal/password-reveal';
import { FormErrors } from '../../../components/field/form-errors';
import { CoasterInput } from '../../../components/field/input.directive';
import { Spinner } from '../../../components/spinner/spinner';
import { AuthCard } from '../../components/auth-card';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Component({
  selector: 'coaster-reset-password',
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
    RouterLink,
  ],
  template: `
    <coaster-auth-card
      testId="reset-password-card"
      [heading]="'auth.reset.heading' | translate"
      [subtitle]="'auth.reset.subtitle' | translate"
    >
      <form [formRoot]="resetForm" class="flex flex-col gap-5">
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
              data-testid="password-input"
              [formField]="resetForm.password"
              [placeholder]="'auth.fields.password_placeholder' | translate"
            />
          </coaster-password-reveal>
        </coaster-field>

        <coaster-form-errors [errors]="resetForm().errors()" />

        <button
          mat-flat-button
          type="submit"
          data-testid="reset-btn"
          class="w-full py-4 text-base font-medium rounded-full gap-2 whitespace-nowrap"
          [disabled]="resetForm().submitting() || resetForm().invalid()"
        >
          @if (resetForm().submitting()) {
            <coaster-spinner />
          }
          {{ 'auth.reset.submit' | translate }}
        </button>
      </form>

      <a footer routerLink="/login" data-testid="login-link" class="text-primary text-sm font-medium">
        {{ 'auth.forgot.back' | translate }}
      </a>
    </coaster-auth-card>
  `,
})
export default class ResetPassword {
  public readonly token = input.required<string>();

  readonly #auth = inject(Auth);
  readonly #router = inject(Router);

  protected readonly formModel = signal({ password: '' });

  readonly resetForm = form(
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
            await this.#auth.resetPassword(this.token(), form().value().password);
            await this.#router.navigate(['/establishments/select']);

            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );
}
