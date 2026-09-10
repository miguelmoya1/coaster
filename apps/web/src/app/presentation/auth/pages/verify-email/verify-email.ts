import { Component, inject, input, OnInit, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthRepository, getErrorMessage } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Spinner } from '../../../components/spinner/spinner';
import { AuthCard } from '../../components/auth-card';

type Outcome = 'checking' | 'done' | 'failed';

@Component({
  selector: 'coaster-verify-email',
  imports: [AuthCard, Spinner, MatButton, TranslatePipe, RouterLink],
  template: `
    <coaster-auth-card testId="verify-email-card" [heading]="'auth.verify.heading' | translate">
      @switch (outcome()) {
        @case ('checking') {
          <div class="flex justify-center py-4"><coaster-spinner /></div>
        }
        @case ('done') {
          <p data-testid="verify-done" class="text-on-surface-variant text-sm text-center">
            {{ 'auth.verify.done' | translate }}
          </p>
        }
        @case ('failed') {
          <p data-testid="verify-failed" class="text-error text-sm text-center" role="alert">
            {{ error() | translate }}
          </p>
        }
      }

      <a
        footer
        mat-flat-button
        routerLink="/establishments/select"
        data-testid="continue-btn"
        class="py-4 text-base font-medium rounded-full whitespace-nowrap"
      >
        {{ 'auth.verify.continue' | translate }}
      </a>
    </coaster-auth-card>
  `,
})
export default class VerifyEmail implements OnInit {
  public readonly token = input.required<string>();

  readonly #repo = inject(AuthRepository);

  protected readonly outcome = signal<Outcome>('checking');
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      await this.#repo.verifyEmail(this.token());
      this.outcome.set('done');
    } catch (error) {
      this.error.set(getErrorMessage(error));
      this.outcome.set('failed');
    }
  }
}
