import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AccountRepository, Auth, Toast } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-verify-email-banner',
  imports: [MatButton, MatIcon, TranslatePipe],
  host: { class: 'block' },
  template: `
    @if (showing()) {
      <div
        data-testid="verify-email-banner"
        role="status"
        class="flex flex-wrap items-center justify-center gap-3 bg-primary-container text-on-primary-container px-4 py-2 text-sm"
      >
        <mat-icon class="text-base!">mark_email_unread</mat-icon>

        <span>{{ 'auth.banner' | translate }}</span>

        <button
          mat-stroked-button
          type="button"
          data-testid="verify-email-banner-btn"
          class="rounded-full"
          [disabled]="sending()"
          (click)="send()"
        >
          {{ 'auth.banner_action' | translate }}
        </button>
      </div>
    }
  `,
})
export class VerifyEmailBanner {
  readonly #auth = inject(Auth);
  readonly #repo = inject(AccountRepository);
  readonly #toast = inject(Toast);

  readonly #dismissed = signal(false);

  protected readonly sending = signal(false);
  protected readonly showing = computed(
    () => this.#auth.isAuthenticated() && this.#auth.currentUser()?.emailVerified === false && !this.#dismissed(),
  );

  protected async send(): Promise<void> {
    this.sending.set(true);

    try {
      await this.#repo.requestEmailVerification();
      this.#dismissed.set(true);
      this.#toast.success('account.email.sent');
    } finally {
      this.sending.set(false);
    }
  }
}
