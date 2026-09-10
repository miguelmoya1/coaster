import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
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

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Component({
  selector: 'coaster-register',
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
      testId="register-card"
      [heading]="'auth.register.heading' | translate"
      [subtitle]="'auth.register.subtitle' | translate"
    >
      <form [formRoot]="registerForm" class="flex flex-col gap-5">
        <coaster-field [label]="'auth.fields.name' | translate">
          <input
            coasterInput
            autocomplete="name"
            enterkeyhint="next"
            data-testid="name-input"
            [formField]="registerForm.name"
            [placeholder]="'auth.fields.name_placeholder' | translate"
          />
        </coaster-field>

        <coaster-field [label]="'auth.fields.email' | translate">
          <input
            coasterInput
            type="email"
            autocomplete="email"
            enterkeyhint="next"
            data-testid="email-input"
            [formField]="registerForm.email"
            [placeholder]="'auth.fields.email_placeholder' | translate"
          />
        </coaster-field>

        <coaster-field
          [label]="'auth.fields.password' | translate"
          [hint]="'auth.fields.password_hint' | translate"
        >
          <input
            coasterInput
            type="password"
            autocomplete="new-password"
            enterkeyhint="send"
            data-testid="password-input"
            [formField]="registerForm.password"
            [placeholder]="'auth.fields.password_placeholder' | translate"
          />
        </coaster-field>

        <coaster-form-errors [errors]="registerForm().errors()" />

        <button
          mat-flat-button
          type="submit"
          data-testid="register-btn"
          class="h-12 w-full gap-2 rounded-full text-base font-medium whitespace-nowrap"
          [disabled]="registerForm().submitting() || registerForm().invalid()"
        >
          @if (registerForm().submitting()) {
            <coaster-spinner />
          }
          {{ 'auth.register.submit' | translate }}
        </button>
      </form>

      <coaster-google-button class="mt-6" (signedIn)="enter()" />

      <p footer class="text-on-surface-variant">
        {{ 'auth.register.have_account' | translate }}
        <a routerLink="/login" data-testid="login-link" class="text-primary font-medium hover:underline">
          {{ 'auth.register.sign_in' | translate }}
        </a>
      </p>
    </coaster-auth-card>
  `,
})
export default class Register {
  readonly #auth = inject(Auth);
  readonly #router = inject(Router);

  protected readonly formModel = signal({ name: '', email: '', password: '' });

  protected async enter(): Promise<void> {
    await this.#router.navigate(['/establishments/select']);
  }

  readonly registerForm = form(
    this.formModel,
    (registration) => {
      required(registration.name);
      maxLength(registration.name, 120);
      required(registration.email);
      email(registration.email);
      required(registration.password);
      minLength(registration.password, PASSWORD_MIN_LENGTH);
      maxLength(registration.password, PASSWORD_MAX_LENGTH);
    },
    {
      submission: {
        action: async (form) => {
          try {
            await this.#auth.register(form().value());
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
