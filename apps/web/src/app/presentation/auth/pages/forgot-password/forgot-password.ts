import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthRepository, handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../components/field/field';
import { FormErrors } from '../../../components/field/form-errors';
import { CoasterInput } from '../../../components/field/input.directive';
import { Spinner } from '../../../components/spinner/spinner';
import { AuthCard } from '../../components/auth-card';

@Component({
  selector: 'coaster-forgot-password',
  imports: [AuthCard, Spinner, MatButton, TranslatePipe, FormRoot, FormField, Field, FormErrors, CoasterInput, RouterLink],
  template: `
    <coaster-auth-card
      testId="forgot-password-card"
      [heading]="'auth.forgot.heading' | translate"
      [subtitle]="'auth.forgot.subtitle' | translate"
    >
      @if (sent()) {
        <p data-testid="forgot-sent" class="text-on-surface-variant text-sm text-center">
          {{ 'auth.forgot.sent' | translate }}
        </p>
      } @else {
        <form [formRoot]="forgotForm" class="flex flex-col gap-5">
          <coaster-field [label]="'auth.fields.email' | translate">
            <input
              coasterInput
              type="email"
              autocomplete="email"
              enterkeyhint="send"
              data-testid="email-input"
              [formField]="forgotForm.email"
              [placeholder]="'auth.fields.email_placeholder' | translate"
            />
          </coaster-field>

          <coaster-form-errors [errors]="forgotForm().errors()" />

          <button
            mat-flat-button
            type="submit"
            data-testid="forgot-btn"
            class="w-full py-4 text-base font-medium rounded-full gap-2 whitespace-nowrap"
            [disabled]="forgotForm().submitting() || forgotForm().invalid()"
          >
            @if (forgotForm().submitting()) {
              <coaster-spinner />
            }
            {{ 'auth.forgot.submit' | translate }}
          </button>
        </form>
      }

      <a footer routerLink="/login" data-testid="login-link" class="text-primary text-sm font-medium">
        {{ 'auth.forgot.back' | translate }}
      </a>
    </coaster-auth-card>
  `,
})
export default class ForgotPassword {
  readonly #repo = inject(AuthRepository);

  protected readonly sent = signal(false);
  protected readonly formModel = signal({ email: '' });

  readonly forgotForm = form(
    this.formModel,
    (credentials) => {
      required(credentials.email);
      email(credentials.email);
    },
    {
      submission: {
        action: async (form) => {
          try {
            await this.#repo.forgotPassword(form().value().email);
            this.sent.set(true);

            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );
}
