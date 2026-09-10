import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { Auth, handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../components/field/field';
import { FormErrors } from '../../../components/field/form-errors';
import { CoasterInput } from '../../../components/field/input.directive';
import { Spinner } from '../../../components/spinner/spinner';
import { AuthCard } from '../../components/auth-card';
import { GoogleButton } from '../../components/google-button';

@Component({
  selector: 'coaster-login',
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
    GoogleButton,
    RouterLink,
  ],
  template: `
    <coaster-auth-card
      testId="login-card"
      [heading]="'auth.login.heading' | translate"
      [subtitle]="'auth.login.subtitle' | translate"
    >
      <form [formRoot]="loginForm" class="flex flex-col gap-5">
        <coaster-field [label]="'auth.fields.email' | translate">
          <input
            coasterInput
            type="email"
            autocomplete="email"
            enterkeyhint="next"
            data-testid="email-input"
            [formField]="loginForm.email"
            [placeholder]="'auth.fields.email_placeholder' | translate"
          />
        </coaster-field>

        <div class="flex flex-col gap-1.5">
          <coaster-field [label]="'auth.fields.password' | translate">
            <input
              coasterInput
              type="password"
              autocomplete="current-password"
              enterkeyhint="send"
              data-testid="password-input"
              [formField]="loginForm.password"
              [placeholder]="'auth.fields.password_placeholder' | translate"
            />
          </coaster-field>

          <a
            routerLink="/forgot-password"
            data-testid="forgot-link"
            class="text-on-surface-variant hover:text-primary self-end text-xs transition-colors"
          >
            {{ 'auth.login.forgot' | translate }}
          </a>
        </div>

        <coaster-form-errors [errors]="loginForm().errors()" />

        <button
          mat-flat-button
          type="submit"
          data-testid="login-btn"
          class="h-12 w-full gap-2 rounded-full text-base font-medium whitespace-nowrap"
          [disabled]="loginForm().submitting() || loginForm().invalid()"
        >
          @if (loginForm().submitting()) {
            <coaster-spinner />
          }
          {{ 'auth.login.submit' | translate }}
        </button>
      </form>

      <coaster-google-button class="mt-6" (signedIn)="enter()" />

      <p footer class="text-on-surface-variant">
        {{ 'auth.login.no_account' | translate }}
        <a routerLink="/register" data-testid="register-link" class="text-primary font-medium hover:underline">
          {{ 'auth.login.create' | translate }}
        </a>
      </p>
    </coaster-auth-card>
  `,
})
export default class Login {
  readonly #auth = inject(Auth);
  readonly #router = inject(Router);

  protected readonly formModel = signal({ email: '', password: '' });

  protected async enter(): Promise<void> {
    await this.#router.navigate(['/establishments/select']);
  }

  readonly loginForm = form(
    this.formModel,
    (credentials) => {
      required(credentials.email);
      email(credentials.email);
      required(credentials.password);
    },
    {
      submission: {
        action: async (form) => {
          try {
            await this.#auth.login(form().value());
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
